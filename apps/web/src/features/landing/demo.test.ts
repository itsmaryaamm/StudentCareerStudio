import { describe, expect, it } from "vite-plus/test";
import { PROMPTS, TILE_HIGHLIGHTS, TILES } from "./content";
import {
	demoReducer,
	factFromSentence,
	factKind,
	initialDemo,
	initialTypewriter,
	stepTypewriter,
	toggleAccordion,
	typewriterText,
} from "./demo";

describe("demo state machine", () => {
	it("walks send, reply, save, reset", () => {
		let state = demoReducer(initialDemo, { type: "send", text: "  I run the film club.  " });
		expect(state).toEqual({ phase: "thinking", message: "I run the film club." });
		state = demoReducer(state, { type: "reply" });
		expect(state.phase).toBe("replied");
		state = demoReducer(state, { type: "save" });
		expect(state.phase).toBe("saved");
		expect(demoReducer(state, { type: "reset" })).toEqual(initialDemo);
	});

	it("ignores empty sentences and sends while thinking", () => {
		expect(demoReducer(initialDemo, { type: "send", text: "   " })).toBe(initialDemo);
		const thinking = demoReducer(initialDemo, { type: "send", text: "first" });
		expect(demoReducer(thinking, { type: "send", text: "second" })).toBe(thinking);
	});

	it("only saves a reply and only replies while thinking", () => {
		expect(demoReducer(initialDemo, { type: "save" })).toBe(initialDemo);
		expect(demoReducer(initialDemo, { type: "reply" })).toBe(initialDemo);
		const thinking = demoReducer(initialDemo, { type: "send", text: "x" });
		expect(demoReducer(thinking, { type: "save" })).toBe(thinking);
	});

	it("can send again after a reply", () => {
		let state = demoReducer(initialDemo, { type: "send", text: "one" });
		state = demoReducer(state, { type: "reply" });
		expect(demoReducer(state, { type: "send", text: "two" })).toEqual({ phase: "thinking", message: "two" });
	});
});

describe("fact card", () => {
	it("uses the first sentence, cut to 110 characters", () => {
		expect(factFromSentence("I led a team. We shipped it.")).toBe("I led a team");
		expect(factFromSentence("a".repeat(200))).toHaveLength(110);
		expect(factFromSentence("...")).toBe("...");
	});

	it("guesses the kind from the words", () => {
		expect(factKind("I volunteer at a food bank")).toBe("Volunteering");
		expect(factKind("I built an app")).toBe("Project");
		expect(factKind("looking for a co-op")).toBe("Goal");
		expect(factKind("I am club treasurer")).toBe("Leadership");
		expect(factKind("I worked a summer job")).toBe("Experience");
	});
});

describe("typewriter", () => {
	it("types, pauses on the full sentence, deletes and moves to the next prompt", () => {
		const prompts = ["abcd", "xy"];
		let state = initialTypewriter;
		const texts: string[] = [];
		for (let i = 0; i < 60; i++) {
			state = stepTypewriter(state, prompts);
			texts.push(typewriterText(state, prompts));
		}
		expect(texts.slice(0, 4)).toEqual(["a", "ab", "abc", "abcd"]);
		// Pause: the full sentence stays for 26 ticks.
		expect(texts.slice(3, 30).every((text) => text === "abcd")).toBe(true);
		expect(texts).toContain("xy");
		expect(state.prompt).toBeLessThan(prompts.length);
	});

	it("starts from the first real prompt", () => {
		expect(PROMPTS.length).toBeGreaterThanOrEqual(5);
		expect(typewriterText(stepTypewriter(initialTypewriter, PROMPTS), PROMPTS)).toBe(PROMPTS[0]?.slice(0, 1));
	});
});

describe("accordion and tiles", () => {
	it("opens one at a time and closes the open one", () => {
		expect(toggleAccordion(0, 2)).toBe(2);
		expect(toggleAccordion(2, 2)).toBe(-1);
		expect(toggleAccordion(-1, 0)).toBe(0);
	});

	it("only lights tiles that exist and are not the logo", () => {
		for (const step of TILE_HIGHLIGHTS)
			for (const index of step) {
				expect(index).toBeLessThan(TILES.length);
				expect(TILES[index]).not.toBeNull();
			}
	});
});
