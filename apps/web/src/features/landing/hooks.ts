import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { SENTENCE_KEY, TILE_HIGHLIGHTS } from "./content";
import { initialTypewriter, stepTypewriter, type Typewriter } from "./demo";

const REDUCED = "(prefers-reduced-motion: reduce)";

/** Tracks a CSS media query. Server and first paint assume it does not match. */
export function useMediaQuery(query: string) {
	const subscribe = useCallback(
		(onChange: () => void) => {
			const list = window.matchMedia(query);
			list.addEventListener("change", onChange);
			return () => list.removeEventListener("change", onChange);
		},
		[query],
	);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		() => false,
	);
}

/** True when the visitor asked for less motion. */
export function usePrefersReducedMotion() {
	return useMediaQuery(REDUCED);
}

export const PHONE_QUERY = "(max-width: 759px)";

/** True below 760px, where the page switches to its phone layout. */
export function useIsPhone() {
	return useMediaQuery(PHONE_QUERY);
}

/** Runs the typewriter placeholder: a new state every ~55ms, none under reduced motion. */
export function useTypewriter(prompts: string[], enabled: boolean) {
	const [state, setState] = useState<Typewriter>(initialTypewriter);
	useEffect(() => {
		if (!enabled) return;
		const id = setInterval(() => setState((current) => stepTypewriter(current, prompts)), 55);
		return () => clearInterval(id);
	}, [enabled, prompts]);
	return state;
}

/** The step of the profile tile cycle (every 1.65s). Under reduced motion every tile stays lit. */
export function useTilePulse(enabled: boolean) {
	const last = TILE_HIGHLIGHTS.length - 1;
	const [pulse, setPulse] = useState(0);
	useEffect(() => {
		if (!enabled) return;
		const id = setInterval(() => setPulse((current) => (current + 1) % TILE_HIGHLIGHTS.length), 1650);
		return () => clearInterval(id);
	}, [enabled]);
	return enabled ? pulse : last;
}

/** True once the page has scrolled past `threshold` px; drives the floating nav. */
export function useScrolledPast(threshold: number) {
	const [scrolled, setScrolled] = useState(false);
	useEffect(() => {
		const update = () => setScrolled(window.scrollY > threshold);
		update();
		window.addEventListener("scroll", update, { passive: true });
		return () => window.removeEventListener("scroll", update);
	}, [threshold]);
	return scrolled;
}

/** Keeps the sentence for the sign-up page. Storage can be blocked, so it never throws. */
export function stashSentence(sentence: string) {
	try {
		sessionStorage.setItem(SENTENCE_KEY, sentence);
	} catch {
		// Private windows and blocked storage: the visitor just retypes it.
	}
}

/** Smooth-scrolls a section under the floating nav, or jumps when the visitor wants less motion. */
export function scrollToSection(id: string) {
	const element = document.getElementById(id);
	if (!element) return;
	const behavior = window.matchMedia(REDUCED).matches ? "auto" : "smooth";
	// A card in a phone carousel also needs its row scrolled sideways to it.
	const track = element.parentElement;
	if (track && track.scrollWidth > track.clientWidth + 1 && getComputedStyle(track).overflowX !== "visible") {
		const left = element.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - 16;
		track.scrollTo({ left, behavior });
	}
	window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 100, behavior });
}

/**
 * Whether the phone's bottom "Start free" button shows: after 480px of scrolling, and not once the "Free to try"
 * section is within 90px of the bottom of the screen, where it would repeat that section's own button.
 */
export function useStartButtonVisible() {
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		const update = () => {
			const panel = document.getElementById("beta");
			const nearPanel = panel ? panel.getBoundingClientRect().top < window.innerHeight - 90 : false;
			setVisible(window.scrollY > 480 && !nearPanel);
		};
		update();
		window.addEventListener("scroll", update, { passive: true });
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, []);
	return visible;
}

/** Which card a snap carousel shows, from its scroll position. */
export function carouselIndex(scrollLeft: number, cardWidth: number, gap: number, count: number) {
	const index = Math.round(scrollLeft / (cardWidth + gap));
	return Math.max(0, Math.min(count - 1, index));
}
