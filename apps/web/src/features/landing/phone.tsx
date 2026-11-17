import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { MENU_ITEMS } from "./content";
import { scrollToSection, useStartButtonVisible } from "./hooks";
import { BrandWordmark } from "@/components/brand-wordmark";

/** The sticky glass bar at the top of a phone: the logo and "Log in", nothing in the hard-to-reach corners. */
export function PhoneTopBar() {
	return (
		<header className="sticky top-0 z-30 flex items-center gap-2 border-b border-[#D9D0F0]/60 bg-[#FCFBF8]/85 py-2 pr-3 pl-4 backdrop-blur-[14px] min-[760px]:hidden">
			<a
				href="#top"
				className="flex min-h-11 items-center gap-2 text-[15.5px] font-bold tracking-[-0.02em] whitespace-nowrap text-[#1A0B3B]"
			>
				<BrandWordmark variant="light" className="h-12" />
			</a>
			<span className="flex-1" />
			<Link
				to="/auth/login"
				className="inline-flex min-h-11 items-center px-2.5 text-[15.5px] font-semibold text-[#3B2F63]"
			>
				Log in
			</Link>
		</header>
	);
}

const FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * The full-screen phone menu. A dialog: it takes focus on open, keeps Tab inside, closes on Esc and returns focus to
 * the Menu button.
 */
function PhoneMenuSheet({ onClose }: { onClose: () => void }) {
	const sheet = useRef<HTMLDivElement>(null);
	const closeButton = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		closeButton.current?.focus();
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const wide = window.matchMedia("(min-width: 760px)");
		const onWide = () => wide.matches && onClose();
		wide.addEventListener("change", onWide);
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
				return;
			}
			if (event.key !== "Tab") return;
			const items = [...(sheet.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
			const first = items[0];
			const last = items[items.length - 1];
			if (!first || !last) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = overflow;
			wide.removeEventListener("change", onWide);
			document.removeEventListener("keydown", onKey);
		};
	}, [onClose]);

	const goTo = (id: string) => {
		onClose();
		// Let the sheet unmount and the page unlock before scrolling.
		setTimeout(() => scrollToSection(id), 50);
	};

	return (
		<div
			ref={sheet}
			role="dialog"
			aria-modal="true"
			aria-label="Menu"
			className="fixed inset-0 z-[100] flex flex-col bg-[#FCFBF8] min-[760px]:hidden"
		>
			<div className="flex items-center py-3.5 pr-3 pl-4">
				<span className="flex items-center gap-2 text-[15.5px] font-bold">
					<BrandWordmark variant="light" className="h-12" />
				</span>
				<span className="flex-1" />
				<button
					ref={closeButton}
					type="button"
					aria-label="Close menu"
					onClick={onClose}
					className="flex size-[46px] cursor-pointer items-center justify-center rounded-[14px] border border-[#E3DCF5] bg-white"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2.2"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<path d="M6 6l12 12M18 6L6 18" />
					</svg>
				</button>
			</div>
			<div className="flex-1 overflow-y-auto px-4 pt-3 pb-6">
				<div className="mx-1 my-2 text-[12.5px] font-bold tracking-[0.06em] text-[#6B6585] uppercase">Services</div>
				{MENU_ITEMS.map((item) => (
					<button
						key={item.target}
						type="button"
						onClick={() => goTo(item.target)}
						className="flex min-h-16 w-full cursor-pointer items-center gap-3.5 bg-transparent px-1.5 py-2 text-left text-[#1A0B3B]"
					>
						<span className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-[#EDE9FE] text-[#6C3CF1]">
							<svg
								width="20"
								height="20"
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
							<span className="block text-[17px] font-semibold">{item.title}</span>
							<span className="block text-[14.5px] text-[#6B6585]">{item.blurb}</span>
						</span>
					</button>
				))}
				<div className="mx-1 my-3 h-px bg-[#E3DCF5]" />
				{[
					["how", "How it works"],
					["trust", "Privacy"],
					["faq", "FAQs"],
				].map(([id, label]) => (
					<button
						key={id}
						type="button"
						onClick={() => goTo(id ?? "")}
						className="block min-h-12 w-full cursor-pointer bg-transparent px-1.5 py-3.5 text-left text-lg font-semibold text-[#1A0B3B]"
					>
						{label}
					</button>
				))}
			</div>
			<div className="flex gap-2.5 border-t border-[#E3DCF5] px-4 pt-3 pb-6">
				<Link
					to="/auth/login"
					onClick={onClose}
					className="flex h-[54px] flex-1 items-center justify-center rounded-2xl border border-[#D9D0F0] bg-white text-[16.5px] font-semibold text-[#1A0B3B]"
				>
					Log in
				</Link>
			</div>
		</div>
	);
}

/** The fixed bottom bar of a phone: "Start free" once the visitor has scrolled, and the Menu button. */
export function PhoneBottomBar() {
	const [open, setOpen] = useState(false);
	const startVisible = useStartButtonVisible();
	const menuButton = useRef<HTMLButtonElement>(null);

	const close = useCallback(() => {
		setOpen(false);
		menuButton.current?.focus({ preventScroll: true });
	}, []);

	return (
		<>
			<div
				className="fixed right-3.5 left-3.5 z-40 flex items-center gap-2.5 min-[760px]:hidden"
				style={{ bottom: "max(14px, env(safe-area-inset-bottom))" }}
			>
				{startVisible && (
					<Link
						to="/auth/register"
						className="scs-grad flex h-14 flex-1 items-center justify-center gap-2 rounded-[18px] text-[17px] font-semibold shadow-[0_16px_32px_-10px_rgba(76,36,180,0.7)]"
					>
						Start free
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M5 12h14 M13 6l6 6-6 6" />
						</svg>
					</Link>
				)}
				<button
					ref={menuButton}
					type="button"
					aria-label="Menu"
					aria-expanded={open}
					aria-haspopup="dialog"
					onClick={() => setOpen(true)}
					className="ml-auto flex size-14 flex-none cursor-pointer items-center justify-center rounded-[18px] border border-[#E3DCF5] bg-white/95 text-[#1A0B3B] shadow-[0_12px_28px_-12px_rgba(26,10,63,0.4)] backdrop-blur-[10px]"
				>
					<svg
						width="22"
						height="22"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						aria-hidden="true"
					>
						<path d="M4 8h16 M4 16h16" />
					</svg>
				</button>
			</div>
			{open && <PhoneMenuSheet onClose={close} />}
		</>
	);
}
