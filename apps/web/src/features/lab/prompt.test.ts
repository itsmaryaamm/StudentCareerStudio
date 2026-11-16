import type { Mission, Question } from "./missions";
import { describe, expect, it } from "vitest";
import { MISSIONS } from "./missions";
import { buildPrompt, resolveAnswer } from "./prompt";

const find = (id: string) => MISSIONS.find((m) => m.id === id) as Mission;
const facts = [
	{ id: "1", text: "Treasurer of the coding club", category: "experience" },
	{ id: "2", text: "Second-year computer science student", category: "education" },
];
const build = (id: string, excluded: string[] = [], answers = {}) =>
	buildPrompt({
		mission: find(id),
		answers,
		facts,
		excluded: new Set(excluded),
		timeZone: "UTC",
	});

describe("Career Lab prompts", () => {
	it("has the four missions with questions, follow-ups and steps", () => {
		expect(MISSIONS.map((m) => m.key)).toEqual([
			"DISCOVER_ME",
			"LINKEDIN_CREATOR",
			"OPPORTUNITY_SCOUT",
			"COMPANY_INTELLIGENCE",
		]);
		for (const m of MISSIONS) {
			expect(m.qs.length).toBeGreaterThan(4);
			expect(m.follow).toHaveLength(3);
			expect(m.steps.length).toBeGreaterThan(8);
		}
	});

	it.each(MISSIONS)("starts $name exactly with the required header", (m) => {
		const lines = build(m.id).split("\n");
		expect(lines.slice(0, 5)).toEqual([
			"STUDENT CAREER STUDIO",
			`MISSION ID: ${m.key}`,
			"MISSION VERSION: 1",
			"",
			"START THIS MISSION NOW.",
		]);
		expect(lines[6]).toBe(m.start.split("\n")[0]);
	});

	it("includes only the facts the student left ticked", () => {
		expect(build("discover")).toContain("- Treasurer of the coding club");
		const without = build("discover", ["1"]);
		expect(without).not.toContain("Treasurer of the coding club");
		expect(without).toContain("Second-year computer science student");
	});

	it("says so when nothing is verified yet, and never invents a fact", () => {
		const empty = buildPrompt({
			mission: find("discover"),
			answers: {},
			facts: [],
			excluded: new Set(),
			timeZone: "UTC",
		});
		expect(empty).toContain("- Nothing added yet. Ask me only if essential.");
		expect(empty).toContain("Use ONLY the facts above.");
	});

	it("is deterministic and carries the student's own answers and clarifications", () => {
		const answers = { avoid: "Cold calling", f0: "We hit 300 riders in a month" };
		expect(build("discover", [], answers)).toBe(build("discover", [], answers));
		const text = build("discover", [], answers);
		expect(text).toContain("- Tasks I want to avoid: Cold calling");
		expect(text).toContain("MY CLARIFICATIONS");
		expect(text).toContain("We hit 300 riders in a month");
	});

	it("adds the time zone to a chosen time, and starts 'fields' from education facts", () => {
		const scout = find("scout");
		expect(build("scout", [], { time: "08:30" })).toContain("08:30 (UTC)");
		expect(resolveAnswer(scout.qs.find((q) => q.pre === "fields") as Question, {}, facts, new Set())).toBe(
			"Second-year computer science student",
		);
	});

	it("keeps contact details out", () => {
		expect(build("discover")).not.toMatch(/@|\+?\d{3}[ -]?\d{3}[ -]?\d{4}/);
	});
});
