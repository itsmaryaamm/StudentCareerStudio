// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { TEMPLATE_COUNT, SENTENCE_KEY } from "./content";
import { ChatBox } from "./hero";
import { Faq } from "./sections";
import { ServicesMenu } from "./services-menu";
import { withRouter } from "./test-utils";

beforeEach(() => {
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			matches: false,
			addEventListener: () => {},
			removeEventListener: () => {},
		})),
	);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.useRealTimers();
	sessionStorage.clear();
});

describe("FAQ accordion", () => {
	it("opens one question at a time and reports it with aria-expanded", () => {
		render(withRouter(<Faq />));
		const [first, second] = screen.getAllByRole("button");
		if (!first || !second) throw new Error("expected FAQ buttons");
		expect(first.getAttribute("aria-expanded")).toBe("true");
		expect(second.getAttribute("aria-expanded")).toBe("false");

		fireEvent.click(second);
		expect(first.getAttribute("aria-expanded")).toBe("false");
		expect(second.getAttribute("aria-expanded")).toBe("true");
		const panel = document.getElementById(second.getAttribute("aria-controls") ?? "");
		expect(panel?.hasAttribute("hidden")).toBe(false);

		fireEvent.click(second);
		expect(second.getAttribute("aria-expanded")).toBe("false");
	});

	it("does not promise a head count of students", () => {
		render(withRouter(<Faq />));
		expect(document.body.textContent).not.toMatch(/first 50/i);
	});
});

describe("services dropdown", () => {
	it("opens on click, closes on Escape and returns focus to the button", () => {
		render(<ServicesMenu />);
		const trigger = screen.getByRole("button", { name: /services/i });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByText("Career Lab")).toBeNull();

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByText("Career Lab")).toBeTruthy();
		expect(screen.getByText(`${TEMPLATE_COUNT} templates, PDF and Word`)).toBeTruthy();

		fireEvent.keyDown(window, { key: "Escape" });
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(trigger);
	});

	it("closes on an outside click but not on a click inside", () => {
		render(
			<div>
				<ServicesMenu />
				<p>elsewhere</p>
			</div>,
		);
		const trigger = screen.getByRole("button", { name: /services/i });
		fireEvent.click(trigger);
		fireEvent.click(screen.getByText("Shared profile"));
		expect(trigger.getAttribute("aria-expanded")).toBe("false");

		fireEvent.click(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		fireEvent.click(screen.getByText("elsewhere"));
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
	});
});

describe("hero chat demo", () => {
	it("plays the scripted demo with the visitor's own sentence and stashes it", () => {
		vi.useFakeTimers();
		render(withRouter(<ChatBox />));
		const field = screen.getByLabelText(/tell the career coach/i);
		fireEvent.change(field, { target: { value: "I volunteer every Saturday at a food bank." } });
		fireEvent.click(screen.getByRole("button", { name: /start free/i }));

		expect(sessionStorage.getItem(SENTENCE_KEY)).toBe("I volunteer every Saturday at a food bank.");
		expect(screen.getByText("Thinking…")).toBeTruthy();

		act(() => {
			vi.advanceTimersByTime(1200);
		});
		expect(screen.queryByText("Thinking…")).toBeNull();
		expect(screen.getByText(/Verify before saving · Volunteering/)).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Save to profile" }));
		expect(screen.getByText(/Verified · Volunteering/)).toBeTruthy();
		const keepGoing = screen.getByRole("link", { name: "Keep going" });
		expect(keepGoing.getAttribute("href")).toBe("/auth/register");

		fireEvent.click(screen.getByRole("button", { name: "Start over" }));
		expect(screen.getByLabelText(/tell the career coach/i)).toBeTruthy();
	});

	it("sends on Enter but not on Shift+Enter", () => {
		render(withRouter(<ChatBox />));
		const field = screen.getByLabelText(/tell the career coach/i);
		fireEvent.change(field, { target: { value: "I run the film club." } });
		fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
		expect(screen.queryByText("Thinking…")).toBeNull();
		fireEvent.keyDown(field, { key: "Enter" });
		expect(screen.getByText("Thinking…")).toBeTruthy();
	});
});
