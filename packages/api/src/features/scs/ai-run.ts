import type { UsageKind } from "./limits";
import type { ModelMessage } from "ai";
import type { z } from "zod";
import { generateText } from "ai";
import { aiModelForTask } from "@reactive-resume/ai/task-models";
import { aiProvidersService } from "../ai-providers/service";
import { getModel } from "../ai/service";
import { createAiUsage } from "../ai/usage";
import { extractJson, GeminiFailure, geminiErrorToOrpc, geminiJson, toFailure } from "./gemini";
import { commitUsage, refundUsage, reserveUsage } from "./limits";

/** The student's own tested AI connection (their key, their bill), if they added one in Settings → AI. */
export async function ownAiProvider(userId: string) {
	try {
		return (await aiProvidersService.getDefaultRunnable({ userId })) ?? null;
	} catch {
		return null;
	}
}

type Input<T> = { system: string; messages: ModelMessage[]; schema: z.ZodType<T> };

async function ownJson<T>(
	provider: NonNullable<Awaited<ReturnType<typeof ownAiProvider>>>,
	userId: string,
	input: Input<T>,
) {
	const started = Date.now();
	const model = aiModelForTask(provider, "fast");
	try {
		const { text } = await generateText({
			model: getModel({
				provider: provider.provider,
				model,
				apiKey: provider.apiKey,
				baseURL: provider.baseURL ?? "",
				usage: createAiUsage(userId, "improve", provider),
			}),
			system: input.system,
			messages: input.messages,
			maxRetries: 1,
			abortSignal: AbortSignal.timeout(60_000),
		});
		const parsed = input.schema.safeParse(extractJson(text));
		if (!parsed.success)
			throw new GeminiFailure("own_schema_mismatch", "The AI's answer wasn't in the expected shape. Please try again.");
		return { data: parsed.data, model, latencyMs: Date.now() - started };
	} catch (error) {
		const failure = toFailure(error);
		console.error(`[scs] own-ai failure: ${failure.reason}`);
		throw failure;
	}
}

/**
 * Every AI call goes through here. A student with their own AI connection is never limited by us: it costs us
 * nothing. Everyone else uses the app's Gemini key, with one unit of allowance taken first and refunded on failure.
 */
export async function runAi<T>(
	userId: string,
	kind: UsageKind,
	input: Input<T>,
): Promise<{ data: T; model: string; own: boolean }> {
	const own = await ownAiProvider(userId);
	if (own) {
		try {
			return { ...(await ownJson(own, userId, input)), own: true };
		} catch (error) {
			throw geminiErrorToOrpc(error instanceof GeminiFailure ? error : toFailure(error));
		}
	}
	const usageId = await reserveUsage(userId, kind);
	try {
		const result = await geminiJson(input);
		await commitUsage(usageId, result.model, result.latencyMs);
		return { data: result.data, model: result.model, own: false };
	} catch (error) {
		const failure = error instanceof GeminiFailure ? error : toFailure(error);
		await refundUsage(usageId, failure.reason);
		throw geminiErrorToOrpc(failure);
	}
}
