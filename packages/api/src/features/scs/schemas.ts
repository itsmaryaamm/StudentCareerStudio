import { z } from "zod";
import { cleanLine } from "@reactive-resume/utils/text-clean";

export const factCategorySchema = z.enum([
	"education",
	"experience",
	"project",
	"skill",
	"achievement",
	"volunteering",
	"certification",
	"language",
	"goal",
	"other",
]);

export const factSchema = z.object({
	id: z.string(),
	category: factCategorySchema,
	text: z.string(),
	status: z.enum(["proposed", "approved", "rejected"]),
	source: z.enum(["chat", "upload", "resume", "manual"]),
	createdAt: z.string(),
});
export type Fact = z.infer<typeof factSchema>;

// Facts the AI proposes are cleaned too: whatever it writes, no markup is stored.
export const proposedFactSchema = z.object({
	category: factCategorySchema,
	text: z.string().max(1200).transform(cleanLine).pipe(z.string().min(3).max(300)),
});

export const linkedinSections = [
	"headline",
	"about",
	"education",
	"experience",
	"projects",
	"volunteering",
	"certifications",
	"skills",
	"featured",
	"contact",
] as const;
export const linkedinSectionSchema = z.enum(linkedinSections);
export type LinkedinSection = z.infer<typeof linkedinSectionSchema>;

export const usageSchema = z.object({
	chat: z.object({ used: z.number(), limit: z.number(), resetsAt: z.string() }),
	upload: z.object({ used: z.number(), limit: z.number(), resetsAt: z.null() }),
});
