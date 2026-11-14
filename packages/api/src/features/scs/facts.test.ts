import { describe, expect, it } from "vitest";
import { isNearDuplicate } from "./facts";

describe("isNearDuplicate", () => {
	it("catches a restatement of the same claim", () => {
		expect(
			isNearDuplicate(
				"Led a team of 4 to build a campus bike-sharing app reaching 300 users in a month",
				"Led a team of 4 to build a campus bike-sharing app",
			),
		).toBe(true);
	});
	it("keeps genuinely different facts", () => {
		expect(isNearDuplicate("Organized Tech Week at university", "B.Sc. Computer Science, expected May 2027")).toBe(
			false,
		);
	});
	it("ignores empty text", () => {
		expect(isNearDuplicate("", "anything")).toBe(false);
	});
});
