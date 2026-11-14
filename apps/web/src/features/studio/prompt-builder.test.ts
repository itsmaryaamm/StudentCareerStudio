import { describe, expect, it } from "vitest";
import { buildPrompt } from "./prompt-builder";

const facts = ["B.Sc. Computer Science, expected May 2027", "Organized Tech Week at university"];

describe("buildPrompt", () => {
	it("includes only the chosen facts and the honesty rules", () => {
		const out = buildPrompt({ kind: "opportunities", target: "chatgpt", facts: [facts[0] as string] });
		expect(out).toContain("B.Sc. Computer Science");
		expect(out).not.toContain("Tech Week");
		expect(out).toContain("Do not invent");
	});

	it("tailors browsing instructions to the assistant", () => {
		const gpt = buildPrompt({ kind: "opportunities", target: "chatgpt", facts });
		const claude = buildPrompt({ kind: "opportunities", target: "claude", facts });
		expect(gpt).toContain("Use web search");
		expect(claude).toContain("If web search is available");
		expect(gpt).not.toBe(claude);
	});

	it("adds preferences and the pasted job post only when given", () => {
		const bare = buildPrompt({ kind: "apply", target: "claude", facts });
		expect(bare).not.toContain("MY PREFERENCES");
		expect(bare).toContain("I will paste the job post");
		const full = buildPrompt({
			kind: "apply",
			target: "claude",
			facts,
			roles: "data analyst",
			locations: "Riyadh",
			jobText: "Junior analyst needed",
		});
		expect(full).toContain("Roles and interests: data analyst");
		expect(full).toContain("Location preferences: Riyadh");
		expect(full).toContain("Junior analyst needed");
	});

	it("never leaks facts that were unticked, and says so when none are shared", () => {
		const out = buildPrompt({ kind: "interview", target: "chatgpt", facts: [] });
		expect(out).toContain("I haven't shared any profile details");
	});
});
