import { Link } from "@tanstack/react-router";
import { useState, type ReactNode, type UIEvent } from "react";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";
import { FAQ, MISSIONS, TEMPLATE_COUNT, TILE_HIGHLIGHTS, TILES, TRUST } from "./content";
import { toggleAccordion } from "./demo";
import { carouselIndex, useIsPhone, usePrefersReducedMotion, useTilePulse } from "./hooks";
import { Reveal } from "./reveal";
import { BrandWordmark } from "@/components/brand-wordmark";

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

const H2 = "m-0 text-[clamp(34px,3.5vw,58px)] leading-[1.06] font-medium tracking-[-0.045em]";
const SUB = "mt-[26px] max-w-[600px] text-[clamp(17px,1.45vw,21px)] leading-[1.7]";

function Icon({ path, size = 20, stroke = 1.7 }: { path: string; size?: number; stroke?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={stroke}
			strokeLinejoin="round"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d={path} />
		</svg>
	);
}

/* ---------- Talk. Check. Use it everywhere. ---------- */

function GlowCard({
	glow,
	visual,
	title,
	children,
}: {
	glow: string;
	visual: ReactNode;
	title: string;
	children: ReactNode;
}) {
	return (
		<Reveal className="relative flex flex-col overflow-hidden rounded-[28px] border border-[#E8E3F5] bg-white max-[759px]:flex-[0_0_82%] max-[759px]:snap-center max-[759px]:rounded-3xl">
			<div aria-hidden="true" className="absolute inset-0" style={{ background: glow }} />
			<div className="relative flex h-[270px] items-center justify-center p-7 max-[759px]:h-auto max-[759px]:min-h-[190px] max-[759px]:p-5">
				{visual}
			</div>
			<div className="relative px-7 pb-[30px] max-[759px]:px-5 max-[759px]:pb-6">
				<h3 className="m-0 mb-2 text-xl font-bold tracking-[-0.025em] max-[759px]:mb-1.5 max-[759px]:text-[21px] max-[759px]:font-semibold">
					{title}
				</h3>
				<p className="m-0 text-[15.5px] leading-[1.55] text-[#4B3F73] max-[759px]:text-base max-[759px]:leading-normal max-[759px]:text-[#6B6585]">
					{children}
				</p>
			</div>
		</Reveal>
	);
}

export function HowItWorks() {
	const ready = ["Résumé Studio", "LinkedIn Studio", "Career Lab missions"];
	return (
		<section
			id="how"
			className="mx-auto max-w-[1280px] scroll-mt-14 px-6 pt-[clamp(80px,10vw,170px)] pb-10 max-[759px]:px-0 max-[759px]:pt-14 max-[759px]:pb-2"
		>
			<div className="mb-[clamp(48px,6vw,96px)] max-w-[720px] max-[759px]:mb-0 max-[759px]:px-[18px]">
				<Reveal as="h2" className={H2}>
					Talk. Check. Use it everywhere.
				</Reveal>
				<p className={`${SUB} text-[#6B6585] max-[759px]:mt-3.5 max-[759px]:text-[17px] max-[759px]:leading-[1.6]`}>
					Tell your coach what you have done. Check what it wrote down. Then use it for your résumé, LinkedIn and more.
				</p>
			</div>
			<div className="scs-track grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5 max-[759px]:flex max-[759px]:snap-x max-[759px]:snap-mandatory max-[759px]:gap-3 max-[759px]:overflow-x-auto max-[759px]:px-[18px] max-[759px]:pt-7 max-[759px]:pb-2">
				<GlowCard
					title="Say what you did"
					glow="radial-gradient(70% 60% at 20% 30%,rgba(167,139,250,.4) 0%,rgba(255,255,255,0) 70%),radial-gradient(50% 50% at 100% 100%,rgba(249,168,212,.35) 0%,rgba(255,255,255,0) 70%)"
					visual={
						<div className="min-h-[120px] w-full rounded-[20px] bg-white p-5 shadow-[0_20px_50px_-20px_rgba(108,60,241,0.5)]">
							<div className="text-[17px] leading-normal text-[#1A0B3B]">
								I led a team of 4 to build a campus app
								<span aria-hidden="true" className="ml-0.5 inline-block h-5 w-0.5 bg-[#6C3CF1] align-[-4px]" />
							</div>
						</div>
					}
				>
					Tell it what you did. It asks a few short questions to fill in the details.
				</GlowCard>
				<GlowCard
					title="Keep what is right"
					glow="radial-gradient(70% 60% at 80% 20%,rgba(253,230,138,.5) 0%,rgba(255,255,255,0) 70%),radial-gradient(50% 50% at 100% 100%,rgba(167,139,250,.3) 0%,rgba(255,255,255,0) 70%)"
					visual={
						<div className="w-full rounded-2xl border border-[#F5E3B5] bg-[#FFF8E8] p-4 shadow-[0_20px_50px_-24px_rgba(122,79,0,0.4)]">
							<div className="mb-1.5 text-[11px] font-bold text-[#7A4F00]">Verify before saving · Project</div>
							<div className="text-[14.5px] leading-[1.45]">
								Led a team of 4 to build a campus bike-sharing app reaching 300 users
							</div>
							<div className="mt-3 flex gap-2" aria-hidden="true">
								<span className="rounded-lg bg-[#6C3CF1] px-3.5 py-2 text-[13px] font-semibold text-white">
									Save to profile
								</span>
								<span className="rounded-lg border border-[#DDD5F2] bg-white px-3.5 py-2 text-[13px]">Discard</span>
							</div>
						</div>
					}
				>
					Keep what is right. Fix or delete the rest. Nothing is saved without you.
				</GlowCard>
				<GlowCard
					title="Build from it"
					glow="radial-gradient(70% 60% at 50% 80%,rgba(147,197,253,.5) 0%,rgba(255,255,255,0) 70%),radial-gradient(50% 50% at 100% 100%,rgba(249,168,212,.4) 0%,rgba(255,255,255,0) 70%)"
					visual={
						<ul className="m-0 flex w-full list-none flex-col gap-2.5 p-0">
							{ready.map((name) => (
								<li
									key={name}
									className="flex items-center gap-2.5 rounded-[14px] border border-[#E3DCF5] bg-white px-4 py-3 text-[14.5px] font-semibold shadow-[0_10px_24px_-14px_rgba(75,29,150,0.4)]"
								>
									<span aria-hidden="true" className="size-2 rounded-full bg-[#6C3CF1]" />
									{name}
									<span className="ml-auto text-[13px] text-[#6C3CF1]">Ready</span>
								</li>
							))}
						</ul>
					}
				>
					Make a résumé, improve LinkedIn, or start an AI mission. It all uses the same facts.
				</GlowCard>
			</div>
			<div className="mt-9 flex flex-wrap items-center gap-3 max-[759px]:hidden">
				<Link
					to="/auth/register"
					className="scs-grad inline-flex h-[52px] items-center gap-2 rounded-[14px] px-[26px] text-[15.5px] font-semibold"
				>
					Start your story
					<span aria-hidden="true">→</span>
				</Link>
				<a
					href="#services"
					className="inline-flex h-[52px] items-center rounded-[14px] border border-[#D9D0F0] bg-white px-6 text-[15.5px] font-semibold text-[#1A0B3B] hover:border-[#6C3CF1]"
				>
					See the tools
				</a>
			</div>
		</section>
	);
}

/* ---------- Dark services block ---------- */

function ProfileTiles() {
	const reduced = usePrefersReducedMotion();
	const pulse = useTilePulse(!reduced);
	const lit = TILE_HIGHLIGHTS[pulse] ?? [];
	return (
		<div className="rounded-3xl border border-white/12 bg-white/4 p-3.5 max-[759px]:rounded-none max-[759px]:border-0 max-[759px]:bg-transparent max-[759px]:p-0">
			<ul className="m-0 grid list-none grid-cols-5 gap-2 p-0 max-[759px]:gap-[7px]">
				{TILES.map((tile, index) => {
					const base =
						"flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border transition-[background-color,border-color] duration-[250ms] max-[759px]:gap-0";
					if (!tile)
						return (
							<li
								key="logo"
								className={`${base} border-transparent bg-[linear-gradient(180deg,#7C4DF5,#FF4FA3)] shadow-[0_0_40px_rgba(176,123,255,0.55)]`}
							>
								<BrandIcon variant="icon" alt="" className="h-auto w-1/2" />
							</li>
						);
					const on = lit.includes(index);
					return (
						<li
							key={tile.label}
							className={`${base} ${on ? "border-[#C9B8FA]/70 bg-[#7C4DF5]/40 text-white" : "border-white/10 bg-white/4 text-[#9A8DCB]"}`}
						>
							<span>
								<Icon path={tile.path} />
							</span>
							<span className="px-[3px] text-center text-[clamp(9px,1vw,11.5px)] leading-[1.2] font-semibold max-[759px]:sr-only">
								{tile.label}
							</span>
						</li>
					);
				})}
			</ul>
		</div>
	);
}

const CARD = "overflow-hidden rounded-[32px] border border-white/12 bg-white/4";
const EYEBROW = "text-[13px] max-[759px]:text-[12.5px] font-bold tracking-[0.06em] text-[#C9B8FA] uppercase";
const CARD_TITLE = "mt-2 mb-2 text-[clamp(24px,2.6vw,32px)] leading-[1.1] font-semibold tracking-[-0.03em] text-white";
const CARD_LINE = "m-0 text-[17px] leading-normal text-[#CFC4EE]";

function ServiceCard({
	id,
	glow,
	delay,
	eyebrow,
	title,
	line,
	zoom,
	children,
}: {
	id: string;
	glow: string;
	delay: string;
	eyebrow: string;
	title: string;
	line: string;
	zoom?: boolean;
	children: ReactNode;
}) {
	return (
		<Reveal id={id} className={`${CARD} max-[759px]:flex-[0_0_86%] max-[759px]:snap-center max-[759px]:rounded-[26px]`}>
			<div
				aria-hidden="true"
				className="relative flex h-[380px] items-center justify-center overflow-hidden p-6 max-[759px]:h-[310px] max-[759px]:p-4"
				style={{ background: glow }}
			>
				<div
					className={`scs-float flex w-full items-center justify-center ${zoom ? "[zoom:.72] max-[759px]:[zoom:.62]" : ""}`}
					style={{ animationDelay: delay }}
				>
					{children}
				</div>
			</div>
			<div className="px-[30px] pt-[26px] pb-8 max-[759px]:px-5 max-[759px]:pt-5 max-[759px]:pb-6">
				<div className={EYEBROW}>{eyebrow}</div>
				<h3 className={CARD_TITLE}>{title}</h3>
				<p className={CARD_LINE}>{line}</p>
			</div>
		</Reveal>
	);
}

function ResumeMock() {
	const chips = ["Classic", "Modern", "Compact", "Bold"];
	return (
		<div className="w-[min(100%,400px)] rounded-[22px] bg-white p-[18px] text-[#1A0B3B] shadow-[0_30px_60px_-30px_rgba(75,29,150,0.5)] max-[759px]:w-[300px] max-[759px]:max-w-full max-[759px]:p-4">
			<div className="mb-3.5 flex flex-wrap gap-1.5">
				{chips.map((chip) => (
					<span
						key={chip}
						className={`rounded-full px-3 py-[5px] text-xs font-semibold ${chip === "Modern" ? "bg-[#6C3CF1] text-white" : "bg-[#F3EFFF] text-[#4B1D96]"} ${chip === "Compact" ? "max-[759px]:hidden" : ""}`}
					>
						{chip}
					</span>
				))}
				<span className="self-center text-xs text-[#6B6585] max-[759px]:hidden">+{TEMPLATE_COUNT - chips.length}</span>
				<span className="self-center text-xs text-[#6B6585] min-[760px]:hidden">+{TEMPLATE_COUNT - 3}</span>
			</div>
			<div className="rounded-xl border border-[#EFEBFA] bg-[#FBFAFF] p-[18px]">
				<div className="text-lg font-bold tracking-[-0.02em]">Maya Chen</div>
				<div className="mb-3.5 text-xs text-[#6B6585]">Computer Science · Co-op seeker</div>
				<div className="mb-2 h-[7px] w-[70px] rounded-[3px] bg-[#C4B2F5]" />
				<div className="mb-[7px] h-1.5 w-full rounded-[3px] bg-[#E3DCF5]" />
				<div className="mb-[7px] h-1.5 w-[88%] rounded-[3px] bg-[#E3DCF5]" />
				<div className="mb-[7px] h-1.5 w-[72%] rounded-[3px] bg-[#E3DCF5]" />
				<div className="mt-3.5 mb-2 h-[7px] w-[70px] rounded-[3px] bg-[#C4B2F5] max-[759px]:hidden" />
				<div className="mb-[7px] h-1.5 w-[95%] rounded-[3px] bg-[#E3DCF5] max-[759px]:hidden" />
			</div>
			<div className="mt-3 flex gap-2">
				{["PDF", "Word"].map((format) => (
					<span
						key={format}
						className="flex-1 rounded-[10px] bg-[#F3EFFF] p-[9px] text-center text-[13px] font-semibold text-[#4B1D96]"
					>
						{format}
					</span>
				))}
			</div>
		</div>
	);
}

function LinkedInMock() {
	return (
		<div className="w-[min(100%,420px)] rounded-[22px] bg-white p-4 text-[#1A0B3B] shadow-[0_30px_60px_-30px_rgba(75,29,150,0.5)]">
			<div className="mb-2.5 rounded-xl bg-[#F8F6FF] px-3.5 py-3 text-sm text-[#6B6585]">
				Student at Northfield University
			</div>
			<div className="flex gap-2.5 px-1 pt-2 pb-3">
				<span className="mt-px size-[18px] flex-none rounded-full border-[1.5px] border-[#E0A526] bg-[#FFF8E8]" />
				<div className="text-[13.5px]">
					<b>Say what you want next</b>
					<div className="mt-0.5 text-[#5E5878]">Name the role you're after.</div>
				</div>
			</div>
			<div className="rounded-xl border-[1.5px] border-[#6C3CF1] bg-[linear-gradient(180deg,#F3EFFF,#EDE9FE)] px-3.5 py-3 text-sm leading-[1.4] font-medium">
				CS student | Led a team of 4 to 300 users | Seeking a co-op
				<div className="mt-1 text-[11.5px] font-normal text-[#6B6585]">Based on your verified facts</div>
			</div>
		</div>
	);
}

function CoachMock() {
	return (
		<div className="flex w-[min(100%,400px)] flex-col gap-2.5 text-[#1A0B3B]">
			<div className="max-w-[88%] self-end rounded-2xl rounded-br bg-[linear-gradient(180deg,#7C4DF5,#5B2FD1)] px-[15px] py-[11px] text-sm leading-[1.45] text-white">
				I volunteer on Saturdays at a food bank.
			</div>
			<div className="rounded-2xl border border-[#F5E3B5] bg-white p-3.5 shadow-[0_24px_50px_-28px_rgba(122,79,0,0.5)]">
				<div className="mb-[5px] text-[11px] font-bold text-[#7A4F00]">Check before saving</div>
				<div className="text-[14.5px]">Volunteered weekly at a food bank</div>
				<div className="mt-2.5 flex gap-2">
					<span className="rounded-lg bg-[linear-gradient(180deg,#7C4DF5,#3B1A9E)] px-[13px] py-[7px] text-[12.5px] font-semibold text-white">
						Save
					</span>
					<span className="rounded-lg border border-[#DDD5F2] bg-white px-[13px] py-[7px] text-[12.5px]">Discard</span>
				</div>
			</div>
		</div>
	);
}

function MissionTiles() {
	return (
		<div className="grid w-[min(100%,440px)] grid-cols-2 gap-3">
			{MISSIONS.map((mission) => (
				<div
					key={mission.name}
					className="relative flex min-h-[230px] flex-col overflow-hidden rounded-[26px] border border-white/14 p-[22px]"
					style={{
						background: `radial-gradient(90% 70% at 100% 0%,${mission.to} 0%,rgba(0,0,0,0) 70%),linear-gradient(160deg,${mission.from},#12072B)`,
						boxShadow: `0 24px 50px -28px ${mission.to}`,
					}}
				>
					<svg
						viewBox="0 0 200 200"
						aria-hidden="true"
						className="absolute -top-[50px] -right-[50px] size-[170px] opacity-20"
					>
						{[30, 55, 80].map((r) => (
							<circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#fff" strokeWidth="1.5" />
						))}
					</svg>
					<div className="relative flex size-10 items-center justify-center rounded-full border border-white/35 bg-white/16 text-white">
						<Icon path={mission.icon} stroke={1.6} />
					</div>
					<div className="relative mt-auto text-base leading-[1.2] font-bold tracking-[-0.02em] text-white">
						{mission.name}
					</div>
				</div>
			))}
		</div>
	);
}

export function Services() {
	const phone = useIsPhone();
	const [card, setCard] = useState(0);
	const onTrackScroll = (event: UIEvent<HTMLDivElement>) => {
		const track = event.currentTarget;
		const first = track.firstElementChild;
		const width = first instanceof HTMLElement ? first.offsetWidth : 300;
		setCard(carouselIndex(track.scrollLeft, width, 12, 4));
	};
	return (
		<section
			id="services"
			className="mx-auto max-w-[1360px] scroll-mt-14 px-4 pt-[clamp(80px,10vw,160px)] pb-5 max-[759px]:px-2 max-[759px]:pt-16 max-[759px]:pb-2"
		>
			<div className="scs-dark relative overflow-hidden rounded-[40px] bg-[#0E0622] p-[clamp(24px,5vw,72px)] text-white max-[759px]:rounded-[32px] max-[759px]:px-0 max-[759px]:pt-[34px] max-[759px]:pb-[30px]">
				<div
					aria-hidden="true"
					className="absolute -top-[180px] -right-[120px] h-[520px] w-[640px]"
					style={{ background: "radial-gradient(circle,rgba(124,77,245,.35),rgba(124,77,245,0) 70%)" }}
				/>
				<div
					aria-hidden="true"
					className="absolute -bottom-[220px] -left-[140px] h-[480px] w-[640px] max-[759px]:hidden"
					style={{ background: "radial-gradient(circle,rgba(255,79,163,.16),rgba(255,79,163,0) 70%)" }}
				/>
				<div className="relative">
					<div className="mb-[clamp(48px,6vw,96px)] max-w-[720px] max-[759px]:mb-0 max-[759px]:px-5">
						<Reveal as="h2" className={`${H2} text-white`}>
							Everything you need, from one chat.
						</Reveal>
						<p className={`${SUB} text-[#CFC4EE] max-[759px]:mt-3.5 max-[759px]:text-[17px] max-[759px]:leading-[1.6]`}>
							Tell your story once and use it in all four tools.
						</p>
					</div>
					<Reveal className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] items-center gap-[clamp(16px,3vw,40px)] rounded-[32px] border border-white/12 bg-white/4 p-[clamp(22px,3.4vw,40px)] max-[759px]:mx-4 max-[759px]:mt-[26px] max-[759px]:mb-0 max-[759px]:block max-[759px]:rounded-[22px] max-[759px]:border-white/[.13] max-[759px]:bg-white/5 max-[759px]:p-3.5">
						<div className="max-[759px]:hidden">
							<div className={EYEBROW}>Your profile</div>
							<h3 className={CARD_TITLE}>Check each fact once.</h3>
							<p className={CARD_LINE}>All four tools use it.</p>
						</div>
						<div className="mx-0.5 mt-0.5 mb-2.5 text-[12.5px] font-bold tracking-[0.06em] text-[#C9B8FA] uppercase min-[760px]:hidden">
							Your profile
						</div>
						<ProfileTiles />
						<p className="mx-0.5 mt-3 mb-0 text-[15px] text-[#CFC4EE] min-[760px]:hidden">
							Check each fact once. All four tools use it.
						</p>
					</Reveal>
					<div
						onScroll={onTrackScroll}
						// A scrollable row needs a way in for keyboard users; on wide screens it is a plain grid.
						tabIndex={phone ? 0 : undefined}
						role={phone ? "group" : undefined}
						aria-label={phone ? "The four tools" : undefined}
						className="scs-track grid grid-cols-[repeat(auto-fit,minmax(min(100%,440px),1fr))] gap-5 max-[759px]:flex max-[759px]:snap-x max-[759px]:snap-mandatory max-[759px]:gap-3 max-[759px]:overflow-x-auto max-[759px]:px-4 max-[759px]:pt-5 max-[759px]:pb-1"
					>
						<ServiceCard
							id="svc-resume"
							delay="0s"
							eyebrow="Résumé Studio"
							title="Edit live. A version for every role."
							line={`${TEMPLATE_COUNT} templates, PDF and Word, and readability checks.`}
							glow="radial-gradient(70% 60% at 25% 20%,rgba(124,77,245,.45) 0%,rgba(14,6,34,0) 70%),radial-gradient(50% 50% at 100% 100%,rgba(255,79,163,.18) 0%,rgba(14,6,34,0) 70%)"
						>
							<ResumeMock />
						</ServiceCard>
						<ServiceCard
							id="svc-linkedin"
							delay="-1.8s"
							eyebrow="LinkedIn Studio"
							title="Paste your link. Fix every section."
							line="Tips and rewrites for your headline, About and skills."
							glow="radial-gradient(70% 60% at 75% 20%,rgba(80,120,255,.4) 0%,rgba(14,6,34,0) 70%),radial-gradient(50% 50% at 100% 100%,rgba(124,77,245,.3) 0%,rgba(14,6,34,0) 70%)"
						>
							<LinkedInMock />
						</ServiceCard>
						<ServiceCard
							id="svc-coach"
							delay="-3.6s"
							eyebrow="Career Coach"
							title="It finds what you forgot."
							line="You check every fact before it is saved."
							glow="radial-gradient(70% 60% at 50% 15%,rgba(255,79,163,.3) 0%,rgba(14,6,34,0) 70%),radial-gradient(50% 50% at 100% 100%,rgba(255,170,60,.2) 0%,rgba(14,6,34,0) 70%)"
						>
							<CoachMock />
						</ServiceCard>
						<ServiceCard
							id="svc-lab"
							delay="-5.4s"
							zoom
							eyebrow="Career Lab"
							title="AI missions that already know you."
							line="Paste into ChatGPT or Claude and it starts."
							glow="radial-gradient(70% 60% at 30% 20%,rgba(255,170,60,.3) 0%,rgba(14,6,34,0) 70%),radial-gradient(50% 50% at 100% 100%,rgba(124,77,245,.35) 0%,rgba(14,6,34,0) 70%)"
						>
							<MissionTiles />
						</ServiceCard>
					</div>
					<div aria-hidden="true" className="mt-3.5 flex justify-center gap-2 min-[760px]:hidden">
						{[0, 1, 2, 3].map((index) => (
							<span
								key={index}
								data-active={card === index}
								className={`h-2 rounded-[4px] transition-[width,background-color] duration-[250ms] ${card === index ? "w-[22px] bg-white" : "w-2 bg-white/30"}`}
							/>
						))}
					</div>
					<div className="mt-10 flex flex-wrap items-center gap-[18px] max-[759px]:hidden">
						<Link
							to="/auth/register"
							className="scs-grad inline-flex h-[52px] items-center gap-2 rounded-[14px] px-[26px] text-[15.5px] font-semibold"
						>
							Start free
							{arrow}
						</Link>
						<span className="text-[15px] text-[#CFC4EE]">Free during the beta</span>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ---------- Trust ---------- */

export function Trust() {
	return (
		<section
			id="trust"
			className="mx-auto max-w-[1280px] scroll-mt-14 px-6 pt-[clamp(80px,10vw,160px)] pb-10 max-[759px]:px-[18px] max-[759px]:pt-16 max-[759px]:pb-2"
		>
			<h2 className={`${H2} mb-6 min-[760px]:hidden`}>Private and honest.</h2>
			<div className="mx-auto mb-10 max-w-[720px] text-center max-[759px]:hidden">
				<div className="text-[13px] font-bold tracking-[0.08em] text-[#6C3CF1]">PRIVATE AND HONEST</div>
				<Reveal as="h2" className={`${H2} mt-3.5`}>
					Built so you can trust what it says about you.
				</Reveal>
			</div>
			<ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-4 p-0 max-[759px]:flex max-[759px]:flex-col max-[759px]:gap-2.5">
				{TRUST.map((item) => (
					<li
						key={item.title}
						className="rounded-[20px] border border-[#E8E3F5] bg-white p-6 max-[759px]:flex max-[759px]:items-start max-[759px]:gap-3.5 max-[759px]:p-[18px]"
					>
						<div className="mb-4 flex size-10 flex-none items-center justify-center rounded-xl bg-[#EDE9FE] text-[#6C3CF1] max-[759px]:mb-0">
							<Icon path={item.path} />
						</div>
						<div>
							<h3 className="m-0 mb-1.5 text-lg font-bold tracking-[-0.02em] max-[759px]:mb-1 max-[759px]:text-[17px]">
								{item.title}
							</h3>
							<p className="m-0 text-[15px] leading-[1.55] text-[#4B3F73] max-[759px]:text-[15.5px] max-[759px]:leading-normal max-[759px]:text-[#6B6585]">
								{item.body}
							</p>
						</div>
					</li>
				))}
			</ul>
		</section>
	);
}

/* ---------- Free to try. Just start. ---------- */

export function StartPanel({ onStart }: { onStart: (sentence: string) => void }) {
	const [value, setValue] = useState("");
	return (
		<section
			id="beta"
			className="mx-auto max-w-[1280px] px-6 pt-[clamp(80px,10vw,160px)] pb-10 max-[759px]:px-2 max-[759px]:pt-16 max-[759px]:pb-2"
		>
			<div className="rounded-[36px] bg-[radial-gradient(120%_120%_at_15%_0%,#7C4DF5_0%,#4B1D96_55%,#240A55_100%)] px-[clamp(20px,5vw,64px)] py-[clamp(36px,6vw,80px)] text-center text-white max-[759px]:rounded-[32px] max-[759px]:px-5 max-[759px]:py-9">
				<Reveal as="h2" className={H2}>
					Free to try. Just start.
				</Reveal>
				<p className="mt-3.5 mb-0 text-lg text-[#E4DAFF] max-[759px]:mt-3 max-[759px]:text-[17px]">
					Tell the coach what you've done.
				</p>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						onStart(value.trim());
					}}
					className="scs-pill mx-auto mt-[30px] flex max-w-[640px] items-center gap-2 rounded-full bg-white py-2 pr-2 pl-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] max-[759px]:mt-[22px] max-[759px]:flex-col max-[759px]:gap-2.5 max-[759px]:rounded-none max-[759px]:bg-transparent max-[759px]:p-0 max-[759px]:shadow-none"
				>
					<input
						value={value}
						onChange={(event) => setValue(event.target.value)}
						placeholder="I led a team that built…"
						aria-label="Tell the career coach about something you've done"
						className="scs-phone-input h-[52px] min-w-0 flex-1 border-0 bg-transparent text-[17px] text-[#1A0B3B] outline-none max-[759px]:h-14 max-[759px]:w-full max-[759px]:flex-none max-[759px]:rounded-[18px] max-[759px]:bg-white max-[759px]:px-[18px]"
					/>
					<button
						type="submit"
						className="scs-grad inline-flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full border-0 px-6 text-[15.5px] font-semibold whitespace-nowrap max-[759px]:h-14 max-[759px]:w-full max-[759px]:rounded-[18px] max-[759px]:text-[17px]"
					>
						Start free
						<span aria-hidden="true">→</span>
					</button>
				</form>
			</div>
		</section>
	);
}

/* ---------- FAQ ---------- */

export function Faq({ initialOpen = 0 }: { initialOpen?: number }) {
	const [open, setOpen] = useState(initialOpen);
	return (
		<section
			id="faq"
			className="mx-auto max-w-[820px] scroll-mt-14 px-6 pt-[clamp(80px,10vw,160px)] pb-10 max-[759px]:px-[18px] max-[759px]:pt-16 max-[759px]:pb-2"
		>
			<Reveal as="h2" className={`${H2} mb-7 text-center max-[759px]:mb-5 max-[759px]:text-left`}>
				FAQs
			</Reveal>
			<div className="flex flex-col border-t border-[#E3DCF5]">
				{FAQ.map((item, index) => {
					const isOpen = open === index;
					return (
						<div key={item.question} className="border-b border-[#E3DCF5]">
							<h3 className="m-0">
								<button
									type="button"
									id={`faq-q-${index}`}
									aria-expanded={isOpen}
									aria-controls={`faq-a-${index}`}
									onClick={() => setOpen((current) => toggleAccordion(current, index))}
									className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent py-3 text-left text-lg font-semibold tracking-[-0.015em] text-[#1A0B3B] max-[759px]:min-h-[62px] max-[759px]:gap-3.5 max-[759px]:text-[17px]"
								>
									{item.question}
									<span
										aria-hidden="true"
										className={`flex-none text-[26px] leading-none font-normal text-[#6C3CF1] transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
									>
										+
									</span>
								</button>
							</h3>
							<div id={`faq-a-${index}`} role="region" aria-labelledby={`faq-q-${index}`} hidden={!isOpen}>
								<p className="m-0 mb-5 max-w-[680px] text-base leading-[1.6] text-[#4B3F73]">{item.answer}</p>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

/* ---------- Closing and footer ---------- */

export function Closing() {
	return (
		<section className="mx-auto max-w-[900px] px-6 pt-20 pb-[90px] text-center max-[759px]:px-[18px] max-[759px]:pt-[72px] max-[759px]:pb-10">
			<Reveal
				as="h2"
				className="m-0 text-[clamp(36px,6vw,68px)] leading-[1.02] font-bold tracking-[-0.05em] max-[759px]:leading-[1.06] max-[759px]:font-medium max-[759px]:tracking-[-0.04em]"
			>
				Your story is better than your résumé says.
			</Reveal>
			<div className="mt-[30px] flex flex-wrap justify-center gap-3 max-[759px]:hidden">
				<Link
					to="/auth/register"
					className="scs-grad inline-flex h-14 items-center gap-2 rounded-[14px] px-[30px] text-base font-semibold"
				>
					Start free
					<span aria-hidden="true">→</span>
				</Link>
				<Link
					to="/auth/register"
					className="inline-flex h-14 items-center rounded-[14px] border border-[#D9D0F0] bg-white px-[26px] text-base font-semibold text-[#1A0B3B] hover:border-[#6C3CF1]"
				>
					Try the coach
				</Link>
			</div>
		</section>
	);
}

export function Footer() {
	return (
		<footer className="border-t border-[#E3DCF5] bg-white">
			<div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-5 px-6 py-8 text-sm text-[#6B6585] max-[759px]:flex-col max-[759px]:items-start max-[759px]:gap-2.5 max-[759px]:px-[18px] max-[759px]:pt-6 max-[759px]:pb-[110px] max-[759px]:text-[14.5px]">
				<span className="flex items-center gap-2.5 font-bold text-[#1A0B3B]">
					<BrandWordmark variant="light" className="h-14" />
				</span>
				<span>Made by Maryam Imran, for students</span>
				<nav
					aria-label="Legal"
					className="ml-auto flex gap-5 max-[759px]:ml-0 max-[759px]:flex-wrap max-[759px]:gap-x-4 max-[759px]:gap-y-1"
				>
					<a href="/privacy" className="text-[#4B3F73] hover:text-[#6C3CF1]">
						Privacy notice
					</a>
					<a href="/terms" className="text-[#4B3F73] hover:text-[#6C3CF1]">
						Terms of use
					</a>
					<a href="/cookies" className="text-[#4B3F73] hover:text-[#6C3CF1]">
						Cookies
					</a>
					<a href="mailto:hello@maryamimran.com" className="text-[#4B3F73] hover:text-[#6C3CF1]">
						Contact
					</a>
				</nav>
				<nav aria-label="Footer" className="flex gap-5 max-[759px]:hidden">
					<a href="#how" className="text-[#4B3F73] hover:text-[#6C3CF1]">
						How it works
					</a>
					<a href="#trust" className="text-[#4B3F73] hover:text-[#6C3CF1]">
						Privacy
					</a>
					<a href="#faq" className="text-[#4B3F73] hover:text-[#6C3CF1]">
						FAQ
					</a>
				</nav>
			</div>
		</footer>
	);
}
