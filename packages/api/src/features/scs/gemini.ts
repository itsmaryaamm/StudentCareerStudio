import type { ModelMessage } from "ai";
import type { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ORPCError } from "@orpc/client";
import { APICallError, generateText, RetryError } from "ai";
import { AI_PROVIDER_DEFAULT_MODELS } from "@reactive-resume/ai/defaults";
import { env } from "@reactive-resume/env/server";

const REQUEST_TIMEOUT_MS = 60_000;

export const geminiModelName = () => env.SCS_GEMINI_MODEL ?? AI_PROVIDER_DEFAULT_MODELS.gemini;

export const isGeminiConfigured = () => Boolean(env.GEMINI_API_KEY);

/** Short, content-free reason stored in the usage ledger and shown to admins. */
export class GeminiFailure extends Error {
	constructor(
		public readonly reason: string,
		public readonly userMessage: string,
	) {
		super(reason);
	}
}

export function toFailure(error: unknown): GeminiFailure {
	if (error instanceof GeminiFailure) return error;
	// The SDK retries once and then wraps the last provider error; classify that underlying error.
	if (RetryError.isInstance(error)) return toFailure(error.lastError);
	if (APICallError.isInstance(error)) {
		const status = error.statusCode;
		if (status === 429) {
			return new GeminiFailure(
				"gemini_429_quota",
				"The AI service is at capacity right now. Nothing was used from your allowance — please try again in a minute.",
			);
		}
		if (status === 400 || status === 401 || status === 403) {
			return new GeminiFailure(
				`gemini_${status}_config`,
				"The AI coach is temporarily unavailable. We've been notified. Nothing was used from your allowance.",
			);
		}
		return new GeminiFailure(
			`gemini_${status ?? "http"}`,
			"The AI service had a problem. Nothing was used from your allowance — please try again.",
		);
	}
	if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
		return new GeminiFailure(
			"gemini_timeout",
			"The AI took too long to answer. Nothing was used from your allowance — please try again.",
		);
	}
	return new GeminiFailure(
		"gemini_unknown",
		"Something went wrong talking to the AI. Nothing was used from your allowance.",
	);
}

/** Maps any Gemini failure to a safe user-facing ORPCError. The raw error is logged server-side, without content. */
export function geminiErrorToOrpc(failure: GeminiFailure): ORPCError<"SERVICE_UNAVAILABLE", unknown> {
	return new ORPCError("SERVICE_UNAVAILABLE", { message: failure.userMessage, data: { reason: failure.reason } });
}

export function extractJson(text: string): unknown {
	const fenceStart = text.indexOf("```");
	const fenceEnd = fenceStart === -1 ? -1 : text.indexOf("```", fenceStart + 3);
	const candidate = fenceEnd === -1 ? text : text.slice(fenceStart + 3, fenceEnd);
	const start = candidate.indexOf("{");
	const end = candidate.lastIndexOf("}");
	if (start === -1 || end < start)
		throw new GeminiFailure(
			"gemini_unparseable",
			"The AI's answer couldn't be read. Nothing was used from your allowance — please try again.",
		);
	try {
		return JSON.parse(candidate.slice(start, end + 1));
	} catch {
		throw new GeminiFailure(
			"gemini_unparseable",
			"The AI's answer couldn't be read. Nothing was used from your allowance — please try again.",
		);
	}
}

export async function geminiJson<T>(input: {
	system: string;
	messages: ModelMessage[];
	schema: z.ZodType<T>;
	signal?: AbortSignal;
}): Promise<{ data: T; model: string; latencyMs: number }> {
	if (!env.GEMINI_API_KEY) {
		throw new GeminiFailure(
			"gemini_not_configured",
			"The AI coach isn't switched on yet. Nothing was used from your allowance.",
		);
	}
	const modelName = geminiModelName();
	const google = createGoogleGenerativeAI({
		apiKey: env.GEMINI_API_KEY,
		...(env.SCS_GEMINI_BASE_URL ? { baseURL: env.SCS_GEMINI_BASE_URL } : {}),
	});
	const started = Date.now();
	try {
		const { text } = await generateText({
			model: google(modelName),
			system: input.system,
			messages: input.messages,
			maxRetries: 1,
			abortSignal: input.signal
				? AbortSignal.any([input.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
				: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});
		const parsed = input.schema.safeParse(extractJson(text));
		if (!parsed.success)
			throw new GeminiFailure(
				"gemini_schema_mismatch",
				"The AI's answer wasn't in the expected shape. Nothing was used from your allowance — please try again.",
			);
		return { data: parsed.data, model: modelName, latencyMs: Date.now() - started };
	} catch (error) {
		const failure = toFailure(error);
		// Reason code only: never the prompt, the reply, or the provider's message (which can echo input).
		console.error(`[scs] gemini failure: ${failure.reason}`);
		throw failure;
	}
}
