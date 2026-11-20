import { expect, it } from "vite-plus/test";
import { FACTS_FOR_FULL, nextStep, storyStrength } from "./strength";

const base = { hasGoal: true, hasContact: true, approvedFacts: 0, resumes: 0 };

it("never starts at zero: account, goal and contact already count", () => {
	expect(storyStrength(base).percent).toBe(35);
	expect(storyStrength({ ...base, hasGoal: false, hasContact: false }).percent).toBe(10);
});

it("rises with each approved fact and tops out at 100", () => {
	expect(storyStrength({ ...base, approvedFacts: 4 }).percent).toBe(58);
	expect(storyStrength({ ...base, approvedFacts: FACTS_FOR_FULL, resumes: 1 }).percent).toBe(100);
	expect(storyStrength({ ...base, approvedFacts: 99, resumes: 3 }).percent).toBe(100);
});

it("asks for facts first, then a résumé, then more facts, then LinkedIn", () => {
	expect(nextStep(base).to).toBe("/dashboard/chat");
	expect(nextStep({ ...base, approvedFacts: 3 }).to).toBe("/dashboard/documents");
	expect(nextStep({ ...base, approvedFacts: 3, resumes: 1 }).detail).toContain("5 more things");
	expect(nextStep({ ...base, approvedFacts: 8, resumes: 1 }).to).toBe("/dashboard/linkedin");
});
