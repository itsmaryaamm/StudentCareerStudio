import { describe, expect, it } from "vitest";
import { isImproved, LINKEDIN_SECTIONS, normalizeLinkedinUrl, runChecks } from "./checks";

describe("LinkedIn section tips", () => {
	it("has the six design sections with their limits", () => {
		expect(LINKEDIN_SECTIONS.map((s) => [s.label, s.limit])).toEqual([
			["Headline", 220],
			["About", 2600],
			["Education", 500],
			["Experience", 2000],
			["Projects", 2000],
			["Skills", 500],
		]);
	});

	it("marks a strong headline as done and a thin one as open", () => {
		const strong = "Computer Science student | Led a 4-person team to 300 users | Seeking a co-op";
		expect(runChecks("headline", strong).every((c) => c.ok)).toBe(true);
		const weak = runChecks("headline", "Student at Northfield University");
		expect(weak.filter((c) => c.ok)).toHaveLength(0);
		expect(weak.map((c) => c.title)).toContain("Say what you want next");
	});

	it("checks each section's own rules", () => {
		expect(
			runChecks("education", "BSc Computer Science · 2024 – 2028 Relevant courses. Coding Club Treasurer.").every(
				(c) => c.ok,
			),
		).toBe(true);
		expect(
			runChecks("experience", "Treasurer, Coding Club · 2025\n• Led the budget of 4000 for events").every((c) => c.ok),
		).toBe(true);
		expect(runChecks("skills", "Python · SQL · Team leadership · Budgeting · Planning").every((c) => c.ok)).toBe(true);
		expect(runChecks("projects", "").some((c) => c.ok)).toBe(false);
	});

	it("only calls a section improved when it has text and every tip passes", () => {
		expect(isImproved("headline", "")).toBe(false);
		expect(
			isImproved("headline", "CS student | Led a team to 300 users | Seeking a co-op in software development"),
		).toBe(true);
		expect(isImproved("headline", "Student")).toBe(false);
	});

	it("accepts LinkedIn profile links in common shapes and refuses everything else", () => {
		expect(normalizeLinkedinUrl("linkedin.com/in/maya-chen")).toBe("https://www.linkedin.com/in/maya-chen");
		expect(normalizeLinkedinUrl("https://www.linkedin.com/in/maya-chen/")).toBe(
			"https://www.linkedin.com/in/maya-chen",
		);
		expect(normalizeLinkedinUrl("  www.linkedin.com/in/Maya-Chen?utm=x ")).toBe(
			"https://www.linkedin.com/in/maya-chen",
		);
		expect(normalizeLinkedinUrl("https://example.com/in/maya")).toBeNull();
		expect(normalizeLinkedinUrl("linkedin.com/company/acme")).toBeNull();
		expect(normalizeLinkedinUrl("")).toBeNull();
	});
});
