import { useEffect, useId, useRef, useState } from "react";
import { MENU_ITEMS } from "./content";
import { scrollToSection } from "./hooks";

/**
 * The "Services" disclosure in the nav. A button with aria-expanded opens a list of buttons that scroll to each
 * service card. Esc and a click outside close it; Esc returns focus to the button.
 */
export function ServicesMenu() {
	const [open, setOpen] = useState(false);
	const root = useRef<HTMLSpanElement>(null);
	const trigger = useRef<HTMLButtonElement>(null);
	const listId = useId();

	useEffect(() => {
		if (!open) return;
		const onClick = (event: MouseEvent) => {
			if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
		};
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			setOpen(false);
			trigger.current?.focus();
		};
		document.addEventListener("click", onClick);
		window.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("click", onClick);
			window.removeEventListener("keydown", onKey);
		};
	}, [open]);

	return (
		<span ref={root} className="relative inline-flex">
			<button
				ref={trigger}
				type="button"
				aria-expanded={open}
				aria-controls={open ? listId : undefined}
				onClick={() => setOpen((value) => !value)}
				className="inline-flex cursor-pointer items-center gap-1.5 rounded-[10px] bg-transparent px-2 py-1.5 whitespace-nowrap text-[#3B2F63]"
				style={{ margin: "-6px -8px" }}
			>
				Services
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
					className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
				>
					<path d="M6 9l6 6 6-6" />
				</svg>
			</button>
			{open && (
				<ul
					id={listId}
					className="absolute top-[calc(100%+18px)] -left-4 z-60 m-0 flex w-[min(380px,92vw)] list-none flex-col gap-0.5 rounded-3xl border border-[#E3DCF5] bg-[#FCFBF8] p-2.5 text-left font-normal whitespace-normal shadow-[0_30px_80px_-24px_rgba(26,10,63,0.45)]"
				>
					{MENU_ITEMS.map((item) => (
						<li key={item.target}>
							<button
								type="button"
								onClick={() => {
									setOpen(false);
									scrollToSection(item.target);
								}}
								className="flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-transparent p-3 text-left hover:bg-[#F3EFFF]"
							>
								<span className="flex size-[38px] flex-none items-center justify-center rounded-[11px] bg-[#EDE9FE] text-[#6C3CF1]">
									<svg
										width="19"
										height="19"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.7"
										strokeLinejoin="round"
										strokeLinecap="round"
										aria-hidden="true"
									>
										<path d={item.path} />
									</svg>
								</span>
								<span>
									<span className="block text-base font-semibold text-[#1A0B3B]">{item.title}</span>
									<span className="mt-0.5 block text-sm leading-[1.4] text-[#6B6585]">{item.blurb}</span>
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</span>
	);
}
