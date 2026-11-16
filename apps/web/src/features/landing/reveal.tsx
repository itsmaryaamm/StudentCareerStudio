import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

const EASE = "cubic-bezier(.22,.61,.36,1)";

type Props = {
	as?: "div" | "h2" | "section";
	id?: string;
	className?: string;
	style?: CSSProperties;
	children: ReactNode;
};

/**
 * Fades its content up as it scrolls into view (0.9s, staggered 100ms by sibling index). Rendered visible so the
 * server HTML and no-JavaScript visitors see everything; below the fold it hides on mount and reveals on scroll.
 * Does nothing under reduced motion.
 */
export function Reveal({ as = "div", id, className, style, children }: Props) {
	const ref = useRef<HTMLElement>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element || typeof IntersectionObserver === "undefined") return;
		// No scroll-reveal for reduced motion, and none on phones.
		if (window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 759px)").matches) return;
		// Already on screen (a reload mid-page, the first section): leave it be.
		if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;

		const index = Array.prototype.indexOf.call(element.parentElement?.children ?? [], element) % 4;
		const delay = `${Math.max(index, 0) * 100}ms`;
		element.style.opacity = "0";
		element.style.transform = "translateY(34px)";
		element.style.transition = `opacity .9s ${EASE} ${delay},transform .9s ${EASE} ${delay}`;

		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				element.style.opacity = "1";
				element.style.transform = "none";
				observer.disconnect();
			},
			{ threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
		);
		observer.observe(element);
		return () => {
			observer.disconnect();
			element.style.opacity = "";
			element.style.transform = "";
			element.style.transition = "";
		};
	}, []);

	const Tag = as as "div";
	return (
		<Tag ref={ref as React.RefObject<HTMLDivElement>} id={id} className={className} style={style}>
			{children}
		</Tag>
	);
}
