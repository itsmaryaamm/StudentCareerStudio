import { Link } from "@tanstack/react-router";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";
import { useIsPhone, useScrolledPast } from "./hooks";
import { ServicesMenu } from "./services-menu";

const arrow = (
	<svg
		width="16"
		height="16"
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
);

/** The brand icon at a fixed pixel size. Decorative here: the product name is written beside it. */
export function BrandMark({ size, className }: { size: number; className?: string }) {
	return (
		<BrandIcon
			variant="icon"
			alt=""
			width={size}
			height={size}
			style={{ width: size, height: size }}
			className={className}
		/>
	);
}

function Links({ compact }: { compact: boolean }) {
	return (
		<div
			className={`flex font-medium whitespace-nowrap max-[759px]:hidden ${compact ? "ml-3 gap-[22px] text-[14.5px]" : "ml-9 gap-7 text-[15px]"}`}
		>
			<a href="#how" className="text-[#3B2F63]">
				How it works
			</a>
			<ServicesMenu />
			<a href="#trust" className="text-[#3B2F63] max-[999px]:hidden">
				Privacy
			</a>
			<a href="#faq" className="text-[#3B2F63] max-[999px]:hidden">
				FAQs
			</a>
		</div>
	);
}

function Actions({ compact }: { compact: boolean }) {
	const size = compact ? "h-10 px-4 text-sm rounded-[11px]" : "h-11 px-5 text-[14.5px] rounded-xl";
	return (
		<span className={`ml-auto flex ${compact ? "gap-2" : "gap-2.5"}`}>
			<Link
				to="/auth/login"
				className={`inline-flex items-center border border-[#D9D0F0] font-semibold whitespace-nowrap text-[#1A0B3B] hover:border-[#6C3CF1] ${compact ? "bg-white" : "bg-white/70 hover:bg-white"} ${size}`}
			>
				Log in
			</Link>
			<Link
				to="/auth/register"
				className={`scs-grad inline-flex items-center gap-2 font-semibold whitespace-nowrap ${size}`}
			>
				Get started
				{arrow}
			</Link>
		</span>
	);
}

/** The nav at the top of the hero. */
export function HeroNav() {
	return (
		<nav
			aria-label="Main"
			className="relative mx-auto flex max-w-[1280px] items-center gap-6 px-6 py-5 max-[759px]:hidden"
		>
			<a
				href="#top"
				className="flex items-center gap-2.5 text-base font-bold tracking-[-0.02em] whitespace-nowrap text-[#1A0B3B]"
			>
				<BrandMark size={32} />
				Student Career Studio
			</a>
			<Links compact={false} />
			<Actions compact={false} />
		</nav>
	);
}

/** The frosted nav that follows the visitor once they scroll past the hero. */
export function FloatingNav() {
	const scrolled = useScrolledPast(420);
	const phone = useIsPhone();
	// Phones have their own bars (phone.tsx).
	if (!scrolled || phone) return null;
	return (
		<div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 max-[759px]:hidden">
			<nav
				aria-label="Main, floating"
				className="pointer-events-auto box-border flex w-full max-w-[1100px] items-center gap-5 rounded-[18px] border border-[#D9D0F0]/90 bg-white/80 py-2 pr-2 pl-[18px] shadow-[0_12px_40px_-16px_rgba(75,29,150,0.35)] backdrop-blur-[16px]"
			>
				<a
					href="#top"
					className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.02em] whitespace-nowrap text-[#1A0B3B]"
				>
					<BrandMark size={26} />
					Student Career Studio
				</a>
				<Links compact />
				<Actions compact />
			</nav>
		</div>
	);
}
