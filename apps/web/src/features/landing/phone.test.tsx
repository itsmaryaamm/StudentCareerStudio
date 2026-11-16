// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { carouselIndex } from "./hooks";
import { PhoneBottomBar } from "./phone";
import { withRouter } from "./test-utils";

beforeEach(() => {
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
	);
	Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
	Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

function scrollTo(y: number) {
	Object.defineProperty(window, "scrollY", { value: y, configurable: true });
	act(() => {
		window.dispatchEvent(new Event("scroll"));
	});
}

describe("carousel dots", () => {
	it("follows the scroll position and stays inside the four cards", () => {
		expect(carouselIndex(0, 300, 12, 4)).toBe(0);
		expect(carouselIndex(320, 300, 12, 4)).toBe(1);
		expect(carouselIndex(940, 300, 12, 4)).toBe(3);
		expect(carouselIndex(5000, 300, 12, 4)).toBe(3);
		expect(carouselIndex(-20, 300, 12, 4)).toBe(0);
	});
});

describe("phone bottom bar", () => {
	it("shows Start free after 480px and hides it near the Free to try panel", () => {
		const panel = document.createElement("section");
		panel.id = "beta";
		let top = 3000;
		panel.getBoundingClientRect = () => ({ top }) as DOMRect;
		document.body.append(panel);
		render(withRouter(<PhoneBottomBar />));

		expect(screen.queryByRole("link", { name: /start free/i })).toBeNull();
		scrollTo(481);
		expect(screen.getByRole("link", { name: /start free/i }).getAttribute("href")).toBe("/auth/register");

		// The panel is now within 90px of the bottom of an 800px screen.
		top = 700;
		scrollTo(2300);
		expect(screen.queryByRole("link", { name: /start free/i })).toBeNull();

		top = 900;
		scrollTo(1200);
		expect(screen.getByRole("link", { name: /start free/i })).toBeTruthy();
	});
});

describe("phone menu sheet", () => {
	it("opens as a dialog, closes on Escape and returns focus to the Menu button", () => {
		render(withRouter(<PhoneBottomBar />));
		const menu = screen.getByRole("button", { name: "Menu" });
		expect(menu.getAttribute("aria-expanded")).toBe("false");

		fireEvent.click(menu);
		const dialog = screen.getByRole("dialog", { name: "Menu" });
		expect(dialog.getAttribute("aria-modal")).toBe("true");
		expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close menu" }));
		expect(menu.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByText("Résumé Studio")).toBeTruthy();
		expect(screen.getByRole("link", { name: "Log in" }).getAttribute("href")).toBe("/auth/login");

		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(menu);
	});

	it("closes with the Close button and keeps Tab inside the sheet", () => {
		render(withRouter(<PhoneBottomBar />));
		const menu = screen.getByRole("button", { name: "Menu" });
		fireEvent.click(menu);
		const close = screen.getByRole("button", { name: "Close menu" });
		close.focus();
		fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
		// Shift+Tab from the first control wraps to the last one, the Log in link.
		expect(document.activeElement).toBe(screen.getByRole("link", { name: "Log in" }));

		fireEvent.click(screen.getByRole("button", { name: "Close menu" }));
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(menu);
	});
});
