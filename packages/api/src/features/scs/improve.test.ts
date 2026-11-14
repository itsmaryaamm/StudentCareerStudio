import { describe, expect, it } from "vitest";
import { addsNewWords } from "./improve";

describe("addsNewWords", () => {
	it("flags words the student never wrote", () => {
		expect(
			addsNewWords(
				"Was a member of the robotics club",
				"Was a member of the robotics club",
				"Contributed to robotics club projects and build activities",
			),
		).toBe(true);
		expect(addsNewWords("Answered customer emails", "", "Resolved customer inquiries via email")).toBe(true);
	});
	it("accepts a rewrite that only changes the opening verb or reorders the student's own words", () => {
		expect(addsNewWords("Worked on the company website", "", "Contributed to the company website")).toBe(false);
		expect(
			addsNewWords("Wrote Python scripts to clean survey data", "", "Developed Python scripts to clean survey data"),
		).toBe(false);
	});
	it("accepts words that appear elsewhere in the field", () => {
		expect(
			addsNewWords(
				"Ran the weekly meeting",
				"Ran the weekly meeting. Used Notion to track actions.",
				"Ran the weekly meeting and tracked actions in Notion",
			),
		).toBe(false);
	});
});
