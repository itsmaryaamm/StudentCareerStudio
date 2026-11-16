import { ORPCError } from "@orpc/client";
import { z } from "zod";
import { protectedProcedure, publicProcedure } from "../../context";
import { accountService, adminService, betaInfo, requireAdmin } from "./account";
import { byokService } from "./byok";
import { chatService, MAX_MESSAGE_CHARS } from "./chat";
import { factsService } from "./facts";
import { linkedinService } from "./linkedin";
import { factCategorySchema, factSchema, linkedinSectionSchema, usageSchema } from "./schemas";
import { uploadService } from "./upload";

const route = (
	method: "GET" | "POST" | "PUT" | "DELETE",
	path: `/${string}`,
	operationId: string,
	summary: string,
) => ({
	method,
	path: `/scs${path}` as `/${string}`,
	tags: ["Student Career Studio"],
	operationId,
	summary,
});
const id = z.object({ id: z.string().min(1).max(64) });

export const scsRouter = {
	beta: publicProcedure
		.route(route("GET", "/beta", "scsBetaInfo", "Founding beta seat availability"))
		.output(z.object({ maxSeats: z.number(), seatsLeft: z.number(), googleClientId: z.string().nullable() }))
		.handler(() => betaInfo()),

	state: protectedProcedure
		.route(route("GET", "/state", "scsState", "Consent, onboarding, usage"))
		.handler(({ context }) => accountService.state(context.user.id)),
	acceptConsent: protectedProcedure
		.route(route("POST", "/consent", "scsAcceptConsent", "Accept the AI data notice"))
		.handler(({ context }) => accountService.acceptConsent(context.user.id)),
	revokeConsent: protectedProcedure
		.route(route("DELETE", "/consent", "scsRevokeConsent", "Withdraw AI consent"))
		.handler(({ context }) => accountService.revokeConsent(context.user.id)),
	setOnboarding: protectedProcedure
		.route(route("PUT", "/onboarding", "scsSetOnboarding", "Record the onboarding choice"))
		.input(z.strictObject({ choice: z.enum(["ai", "resume", "linkedin", "skip"]) }))
		.handler(({ context, input }) => accountService.setOnboarding(context.user.id, input.choice)),
	saveIntake: protectedProcedure
		.route(route("PUT", "/onboarding/intake", "scsSaveIntake", "Save progress of the guided first conversation"))
		.input(
			z.strictObject({
				preferredName: z.string().trim().min(1).max(40).optional(),
				step: z
					.enum(["welcome", "situation", "inventory", "contact", "resume", "linkedin", "interview", "done"])
					.optional(),
				complete: z.boolean().optional(),
				intake: z
					.strictObject({
						situation: z.string().trim().max(300).optional(),
						first: z.enum(["resume", "linkedin", "portfolio"]).optional(),
						has: z
							.strictObject({
								resume: z.boolean().optional(),
								linkedin: z.boolean().optional(),
								portfolio: z.boolean().optional(),
							})
							.optional(),
						contact: z
							.strictObject({
								linkedin: z.string().trim().max(200).optional(),
								email: z.string().trim().max(120).optional(),
								phone: z.string().trim().max(40).optional(),
								portfolio: z.string().trim().max(200).optional(),
							})
							.optional(),
					})
					.optional(),
			}),
		)
		.handler(({ context, input }) => accountService.saveIntake(context.user.id, input)),
	setOwnKey: protectedProcedure
		.route(route("PUT", "/gemini-key", "scsSetOwnGeminiKey", "Use my own Gemini API key"))
		.input(z.strictObject({ apiKey: z.string().min(1).max(200) }))
		.handler(({ context, input }) => byokService.set(context.user.id, input.apiKey)),
	useFriendCode: protectedProcedure
		.route(route("PUT", "/referral", "scsUseFriendCode", "Enter a friend's code for a bigger allowance"))
		.input(z.strictObject({ code: z.string().trim().min(1).max(32) }))
		.handler(async ({ context, input }) => {
			const { applyReferral } = await import("@reactive-resume/auth/referrals");
			const result = await applyReferral(context.user.id, input.code);
			if (result === "applied") return;
			throw new ORPCError("BAD_REQUEST", {
				message:
					result === "own"
						? "That's your own code. Share it with a friend instead."
						: result === "already"
							? "You've already used a friend's code."
							: "That code wasn't found. Check it and try again.",
			});
		}),
	clearOwnKey: protectedProcedure
		.route(route("DELETE", "/gemini-key", "scsClearOwnGeminiKey", "Stop using my own Gemini key"))
		.handler(({ context }) => byokService.clear(context.user.id)),
	exportData: protectedProcedure
		.route(route("GET", "/export", "scsExportData", "Download all my data"))
		.handler(({ context }) => accountService.exportData(context.user.id)),
	usage: protectedProcedure
		.route(route("GET", "/usage", "scsUsage", "My AI allowance"))
		.output(usageSchema)
		.handler(async ({ context }) => (await accountService.state(context.user.id)).usage),

	facts: {
		list: protectedProcedure
			.route(route("GET", "/facts", "scsListFacts", "My career profile"))
			.output(z.array(factSchema))
			.handler(({ context }) => factsService.list(context.user.id)),
		add: protectedProcedure
			.route(route("POST", "/facts", "scsAddFact", "Add a fact to my profile"))
			.input(z.strictObject({ category: factCategorySchema, text: z.string().trim().min(3).max(300) }))
			.output(factSchema)
			.handler(({ context, input }) => factsService.add(context.user.id, input.category, input.text)),
		approve: protectedProcedure
			.route(route("POST", "/facts/{id}/approve", "scsApproveFact", "Approve a proposed fact"))
			.input(id)
			.output(factSchema)
			.handler(({ context, input }) => factsService.setStatus(context.user.id, input.id, "approved")),
		reject: protectedProcedure
			.route(route("POST", "/facts/{id}/reject", "scsRejectFact", "Discard a proposed fact"))
			.input(id)
			.output(factSchema)
			.handler(({ context, input }) => factsService.setStatus(context.user.id, input.id, "rejected")),
		edit: protectedProcedure
			.route(route("PUT", "/facts/{id}", "scsEditFact", "Edit a fact"))
			.input(id.extend({ text: z.string().trim().min(3).max(300) }))
			.output(factSchema)
			.handler(({ context, input }) => factsService.edit(context.user.id, input.id, input.text)),
		delete: protectedProcedure
			.route(route("DELETE", "/facts/{id}", "scsDeleteFact", "Delete a fact"))
			.input(id)
			.handler(({ context, input }) => factsService.remove(context.user.id, input.id)),
		importFromResumes: protectedProcedure
			.route(route("POST", "/facts/import-resumes", "scsImportFacts", "Propose facts from my résumés"))
			.input(z.object({}).optional())
			.handler(({ context }) => factsService.importFromResumes(context.user.id)),
	},

	chat: {
		threads: protectedProcedure
			.route(route("GET", "/chat/threads", "scsChatThreads", "My conversations"))
			.handler(({ context }) => chatService.listThreads(context.user.id)),
		messages: protectedProcedure
			.route(route("GET", "/chat/threads/{id}", "scsChatMessages", "Messages in a conversation"))
			.input(id)
			.handler(({ context, input }) => chatService.messages(context.user.id, input.id)),
		deleteThread: protectedProcedure
			.route(route("DELETE", "/chat/threads/{id}", "scsDeleteThread", "Delete a conversation"))
			.input(id)
			.handler(({ context, input }) => chatService.deleteThread(context.user.id, input.id)),
		send: protectedProcedure
			.route(route("POST", "/chat/send", "scsChatSend", "Send a message to the coach"))
			.input(
				z.strictObject({
					threadId: z.string().min(1).max(64).optional(),
					message: z.string().max(MAX_MESSAGE_CHARS + 200),
					/** "interview": the get-to-know-you conversation for a student who has no résumé yet. */
					mode: z.enum(["interview"]).optional(),
				}),
			)
			.handler(({ context, input }) => chatService.send(context.user.id, input)),
		analyze: protectedProcedure
			.route(route("POST", "/chat/analyze", "scsAnalyzeUpload", "Analyze a document or image"))
			.input(
				z.strictObject({
					filename: z.string().min(1).max(200),
					mimeType: z.string().max(100),
					dataBase64: z.string().min(1),
					threadId: z.string().min(1).max(64).optional(),
				}),
			)
			.handler(({ context, input }) => uploadService.analyze(context.user.id, input)),
	},

	linkedin: {
		generate: protectedProcedure
			.route(route("POST", "/linkedin/generate", "scsLinkedinGenerate", "Generate LinkedIn text from my profile"))
			.input(z.strictObject({ section: linkedinSectionSchema, instruction: z.string().max(200).optional() }))
			.handler(({ context, input }) => linkedinService.generate(context.user.id, input)),
		drafts: protectedProcedure
			.route(route("GET", "/linkedin/drafts", "scsLinkedinDrafts", "My saved LinkedIn drafts"))
			.handler(({ context }) => linkedinService.drafts(context.user.id)),
		saveDraft: protectedProcedure
			.route(route("PUT", "/linkedin/drafts/{section}", "scsLinkedinSaveDraft", "Save a LinkedIn draft"))
			.input(z.strictObject({ section: linkedinSectionSchema, content: z.string().max(3000) }))
			.handler(({ context, input }) => linkedinService.saveDraft(context.user.id, input.section, input.content)),
	},

	feedback: {
		submit: protectedProcedure
			.route(route("POST", "/feedback", "scsSubmitFeedback", "Send feedback to the beta team"))
			.input(
				z.strictObject({
					rating: z.number().int().min(1).max(5),
					category: z.enum(["bug", "idea", "praise", "other"]),
					message: z.string().trim().min(3).max(2000),
					page: z.string().max(120).optional(),
				}),
			)
			.handler(({ context, input }) => accountService.submitFeedback(context.user.id, input)),
	},

	admin: {
		stats: protectedProcedure
			.route(route("GET", "/admin/stats", "scsAdminStats", "Beta dashboard numbers"))
			.handler(async ({ context }) => {
				await requireAdmin(context.user.id);
				return adminService.stats();
			}),
		users: protectedProcedure
			.route(route("GET", "/admin/users", "scsAdminUsers", "Registered users"))
			.handler(async ({ context }) => {
				await requireAdmin(context.user.id);
				return adminService.users();
			}),
		errors: protectedProcedure
			.route(route("GET", "/admin/errors", "scsAdminErrors", "Recent AI errors"))
			.handler(async ({ context }) => {
				await requireAdmin(context.user.id);
				return adminService.errors();
			}),
		feedback: protectedProcedure
			.route(route("GET", "/admin/feedback", "scsAdminFeedback", "Beta feedback"))
			.handler(async ({ context }) => {
				await requireAdmin(context.user.id);
				return adminService.feedback();
			}),
	},
};
