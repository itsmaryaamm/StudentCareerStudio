import type { NewDocumentContext } from "@/features/documents/new-document-dialog";
import type { IconName } from "@reactive-resume/ui/components/icon";
import type { ReactElement, ReactNode } from "react";
import { i18n } from "@lingui/core";
import { plural, t } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate, useRouteContext, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@reactive-resume/ui/components/avatar";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";
import { Icon } from "@reactive-resume/ui/components/icon";
import { ariaShortcut, formatShortcut, Kbd } from "@reactive-resume/ui/components/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@reactive-resume/ui/components/tooltip";
import { useBreakpoint } from "@reactive-resume/ui/hooks/use-breakpoint";
import { getInitials } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { MobileTabIndicator } from "@/components/layout/mobile-tab-indicator";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { useDialogStore } from "@/dialogs/store";
import { GuestBanner } from "@/features/auth/components/guest-banner";
import { useCommandPaletteStore } from "@/features/command-palette/store";
import { DocumentLibraryProvider } from "@/features/documents/library-session";
import { shortcutOverlayOpen } from "@/features/keyboard-shortcuts/blocking";
import { LEAD_GROUP } from "@/features/keyboard-shortcuts/groups";
import { useShortcutSettings } from "@/features/keyboard-shortcuts/settings";
import { showKeyboardShortcuts } from "@/features/keyboard-shortcuts/store";
import { isEditableElementFocused } from "@/features/resume/builder/draft";
import { FeedbackButton } from "@/features/studio/feedback";
import { trashedApplicationsQueryOptions } from "@/features/trash/queries";
import { orpc } from "@/libs/orpc/client";

type NavItem = {
	to:
		| "/dashboard"
		| "/dashboard/documents"
		| "/dashboard/linkedin"
		| "/dashboard/chat"
		| "/dashboard/prompts"
		| "/dashboard/admin"
		| "/dashboard/trash";
	icon: IconName;
	label: string;
	/** Shorter name for the phone tab bar. */
	short?: string;
	/** A quiet number at the end of the row. */
	count?: number;
	/** A warn badge instead: something here is waiting for the user. */
	badge?: number;
};

/** The four places, then Trash. Counts appear once loaded; a zero shows nothing. */
function useNavItems() {
	const { data: counts } = useQuery(orpc.documents.counts.queryOptions());
	const { data: studio } = useQuery(orpc.scs.state.queryOptions());
	const { data: trashedApplications } = useQuery(trashedApplicationsQueryOptions());

	const items: NavItem[] = [
		{ to: "/dashboard", icon: "house-simple", label: "Home", short: "Home" },
		{
			to: "/dashboard/documents",
			icon: "files",
			label: "My résumés",
			short: "Résumés",
			...(counts ? { count: counts.resume } : {}),
		},
		{ to: "/dashboard/linkedin", icon: "linkedin-logo", label: "LinkedIn Studio", short: "LinkedIn" },
		{ to: "/dashboard/chat", icon: "sparkle", label: "Career Coach", short: "Coach" },
		{ to: "/dashboard/prompts", icon: "chat-text", label: "Career Prompts", short: "Prompts" },
		...(studio?.isAdmin
			? [{ to: "/dashboard/admin", icon: "chart-line-up", label: "Beta dashboard", short: "Admin" } satisfies NavItem]
			: []),
	];
	// Always shown; documents and applications share it.
	const trash: NavItem = {
		to: "/dashboard/trash",
		icon: "trash",
		label: t`Trash`,
		count: (counts?.trash ?? 0) + (trashedApplications?.total ?? 0),
	};

	return { items, trash };
}

/** Whether the item is the current page: Today is exact, the others match their section. */
function useIsCurrent() {
	const matchRoute = useMatchRoute();
	return (to: NavItem["to"]) => Boolean(matchRoute({ to, fuzzy: to !== "/dashboard" }));
}

type ApplicationsSearch = {
	q: string;
	view: "list" | "board" | "insights" | "calendar";
	closed: boolean;
	create: boolean;
	applicationId?: string;
};

/**
 * N follows the section: Applications saves a job, Letters starts a letter, and the rest offers every object. The
 * sidebar has no New button; each page owns its one primary action.
 */
function useNewAction() {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const location = useRouterState({ select: (state) => state.location });
	const openDialog = useDialogStore((state) => state.openDialog);

	const context: NewDocumentContext = matchRoute({ to: "/dashboard/applications", fuzzy: true })
		? "applications"
		: matchRoute({ to: "/dashboard/career", fuzzy: true })
			? "career"
			: new URLSearchParams(location.searchStr).get("type") === "letter"
				? "letters"
				: "documents";

	return useCallback(() => {
		// The application page owns Save job; its one-shot ?create link opens that dialog.
		if (context === "applications") {
			if (location.pathname === "/dashboard/applications") {
				// Keep the current view, search and closed filter when the page is already open.
				void navigate({
					to: "/dashboard/applications",
					search: (previous: ApplicationsSearch) => ({ ...previous, create: true }),
				});
			} else {
				void navigate({ to: "/dashboard/applications", search: { create: true } });
			}
			return;
		}
		openDialog("document.new", context === "documents" ? undefined : { context });
	}, [context, location.pathname, navigate, openDialog]);
}

/**
 * The app shell for every dashboard page: a 248px sidebar at ≥1024, a 64px icon rail at 640–1023 and a 64px tab
 * bar below 640. An application's workspace is full screen on phones, with its own back link and action bar, so it
 * has no tab bar. N opens New anywhere outside a field.
 */
type AppShellProps = { children: ReactNode };

export function AppShell({ children }: AppShellProps) {
	const { t } = useLingui();
	const breakpoint = useBreakpoint();
	const openNew = useNewAction();
	const navigate = useNavigate();
	const openDialog = useDialogStore((state) => state.openDialog);
	const pendingNew = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancelNew = () => {
		if (pendingNew.current !== null) clearTimeout(pendingNew.current);
		pendingNew.current = null;
	};
	useEffect(() => cancelNew, []);
	const characterShortcuts = useShortcutSettings((state) => state.characterShortcuts);
	const [collapsed, setCollapsed] = useState(() => {
		try {
			return localStorage.getItem("scs.sidebar") === "collapsed";
		} catch {
			return false;
		}
	});
	const toggleSidebar = () =>
		setCollapsed((was) => {
			try {
				localStorage.setItem("scs.sidebar", was ? "open" : "collapsed");
			} catch {
				// Remembering it is a convenience.
			}
			return !was;
		});
	const matchRoute = useMatchRoute();
	const tabs =
		breakpoint === "mobile" &&
		!matchRoute({ to: "/dashboard/applications/$applicationId/{-$tab}", fuzzy: true }) &&
		!matchRoute({ to: "/dashboard/settings", fuzzy: true });

	useHotkey(
		"N",
		() => {
			if (isEditableElementFocused() || shortcutOverlayOpen()) return;
			cancelNew();
			// Give the explicit N R / N L / N J sequences time to finish before the contextual N action.
			pendingNew.current = setTimeout(() => {
				pendingNew.current = null;
				if (!isEditableElementFocused() && !shortcutOverlayOpen()) openNew();
			}, 600);
		},
		{
			enabled: characterShortcuts,
			meta: {
				name: matchRoute({ to: "/dashboard/applications", fuzzy: true }) ? t`Save a job` : t`New`,
				group: LEAD_GROUP,
			},
		},
	);

	useHotkey(
		["N", "R"],
		() => {
			cancelNew();
			if (!isEditableElementFocused() && !shortcutOverlayOpen()) openDialog("document.new", undefined);
		},
		{ enabled: characterShortcuts, timeout: 600, meta: { name: t`New resume` } },
	);
	useHotkey(
		["N", "L"],
		() => {
			cancelNew();
			if (!isEditableElementFocused() && !shortcutOverlayOpen()) openDialog("document.new", { context: "letters" });
		},
		{ enabled: characterShortcuts, timeout: 600, meta: { name: t`New cover letter` } },
	);
	useHotkey(
		["N", "J"],
		() => {
			cancelNew();
			if (!isEditableElementFocused() && !shortcutOverlayOpen())
				void navigate({ to: "/dashboard/applications", search: { create: true } });
		},
		{ enabled: characterShortcuts, timeout: 600, meta: { name: t`Save a job` } },
	);

	return (
		<div
			style={{ ["--app-sidebar" as string]: collapsed ? "72px" : "264px" }}
			className={cn(
				"grid min-h-svh bg-bg transition-[grid-template-columns] duration-200",
				breakpoint === "mobile"
					? tabs
						? // The bar's height, for anything a page pins above it.
							"grid-rows-[minmax(0,1fr)_auto] [--app-tabbar:calc(64px+env(safe-area-inset-bottom))]"
						: ""
					: breakpoint === "tablet"
						? "grid-cols-[64px_minmax(0,1fr)]"
						: "grid-cols-[var(--app-sidebar)_minmax(0,1fr)]",
			)}
		>
			<a
				href="#main-content"
				className="sr-only rounded-md bg-raised px-4 py-2 text-sm focus:not-sr-only focus:absolute focus:inset-s-2 focus:top-2 focus:z-[100]"
			>
				<Trans>Skip to main content</Trans>
			</a>
			{breakpoint !== "mobile" &&
				(breakpoint === "tablet" ? <Rail /> : <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />)}
			<main id="main-content" data-design="main" className="group/main flex min-w-0 flex-col">
				<GuestBanner />
				{/* calm: remove once every page with tabs places PhoneHeaderActions in its own header. */}
				{tabs && (
					<PhoneHeaderActions
						fallback
						className="me-1.5 h-12 justify-end group-has-[[data-phone-header-actions=page]]/main:hidden"
					/>
				)}
				<DocumentLibraryProvider>{children}</DocumentLibraryProvider>
			</main>
			{tabs && <MobileTabs />}
		</div>
	);
}

const count = "ms-auto font-mono text-xs font-medium";
const badge =
	"h-[18px] min-w-[18px] rounded-full bg-warn px-[5px] text-center font-mono text-[11px] leading-[18px] font-semibold text-warn-ink";
// Labels may wrap in longer locales; counts keep their own space.
const row =
	"flex min-h-10 items-center gap-3 rounded-md px-2.5 text-start text-sm font-medium transition-[background-color,color,scale] duration-quick ease-enter active:scale-[0.97]";
const idle = "text-ink-2 hover:bg-hover hover:text-ink";

const navIdle = "text-[#d2c7f0] hover:bg-white/10 hover:text-white";
const navActive =
	"bg-[linear-gradient(90deg,rgba(124,77,245,.55),rgba(124,77,245,.25))] font-semibold text-white shadow-[inset_2px_0_0_#a78bfa]";

/** The purple sidebar: 264px, or 72px with icons only. The logo and the chevron both fold it. */
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
	const { t } = useLingui();
	const { session } = useRouteContext({ from: "/dashboard" });
	const { items } = useNavItems();
	const isCurrent = useIsCurrent();
	const matchRoute = useMatchRoute();
	const openPalette = useCommandPaletteStore((state) => state.setOpen);

	return (
		<nav
			data-design="side"
			aria-label={t`Main`}
			// The dark theme's tokens give light text and soft hovers on the purple.
			className="dark sticky top-0 flex h-svh flex-col gap-1 overflow-hidden bg-[linear-gradient(180deg,#2a0f5e,#1a0a3f)] px-3 pt-4 pb-3 text-white [view-transition-name:app-nav]"
		>
			<div className="mb-2 flex h-10 items-center gap-2.5 px-1">
				{collapsed ? (
					<button
						type="button"
						aria-label="Expand the sidebar"
						title="Student Career Studio"
						onClick={onToggle}
						className="grid size-10 shrink-0 place-items-center rounded-lg hover:bg-white/10"
					>
						<BrandIcon variant="icon" alt="" className="size-8 rounded-lg" />
					</button>
				) : (
					<>
						<Link to="/" className="flex min-w-0 flex-1 items-center gap-2 text-sm leading-5 font-semibold">
							<BrandIcon variant="icon" alt="" className="size-8 shrink-0 rounded-lg" />
							<span className="flex min-w-0 flex-col leading-tight">
								<span className="truncate">Student Career Studio</span>
								<span className="text-[11px] font-normal text-[#d2c7f0]">Beta</span>
							</span>
						</Link>
						<button
							type="button"
							aria-label="Collapse the sidebar"
							onClick={onToggle}
							className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-[#d2c7f0] hover:bg-white/20 hover:text-white"
						>
							<Icon name="caret-left" size={16} />
						</button>
					</>
				)}
			</div>

			{!collapsed && (
				<button
					type="button"
					data-design="srch"
					aria-keyshortcuts={ariaShortcut("⌘K")}
					onClick={() => openPalette(true)}
					className="mb-3 flex h-9 items-center gap-2 overflow-hidden rounded-[10px] bg-white/10 ps-2.5 pe-2 text-start text-sm text-[#d2c7f0] transition-colors duration-quick hover:bg-white/15"
				>
					<Icon name="magnifying-glass" size={18} />
					<Trans>Search or jump to…</Trans>
					<Kbd className="ms-auto bg-white/10 text-[#d2c7f0]">{formatShortcut("⌘K")}</Kbd>
				</button>
			)}

			{items.map((item) => (
				<NavLink key={item.to} item={item} current={isCurrent(item.to)} collapsed={collapsed} />
			))}

			<div className="flex-1" />

			{!collapsed && <SidebarUsage />}
			{!collapsed && <FeedbackButton className="justify-start text-[#d2c7f0] hover:bg-white/10 hover:text-white" />}
			<Link
				to="/dashboard/settings"
				title={collapsed ? t`Settings` : undefined}
				aria-label={collapsed ? t`Settings` : undefined}
				aria-current={matchRoute({ to: "/dashboard/settings", fuzzy: true }) ? "page" : undefined}
				className={cn(
					row,
					"aria-[current=page]:bg-white/15 aria-[current=page]:text-white",
					navIdle,
					collapsed && "justify-center px-0",
				)}
			>
				<Icon name="gear-six" />
				{!collapsed && <Trans>Settings</Trans>}
			</Link>
			<Link
				to="/dashboard/settings"
				data-design="acct"
				title={collapsed ? session.user.name : undefined}
				className={cn(
					"mt-1 flex h-12 items-center gap-2.5 rounded-[10px] px-1.5 transition-colors duration-quick hover:bg-white/10",
					collapsed && "justify-center",
				)}
			>
				<span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#6c3cf1] text-xs font-bold text-white">
					{session.user.image ? (
						<img src={session.user.image} alt="" className="size-full object-cover" />
					) : (
						<AccountMark name={session.user.name} guest={!!session.user.isAnonymous} />
					)}
				</span>
				{!collapsed && (
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="truncate text-sm leading-[18px] font-semibold">{session.user.name}</span>
						<span className="truncate text-xs leading-4 text-[#d2c7f0]">
							{session.user.isAnonymous ? <Trans>Not saved to an account</Trans> : session.user.email}
						</span>
					</span>
				)}
			</Link>
		</nav>
	);
}

/** Messages left today, how to get more, and when it's nearly gone the invite button turns solid. */
function SidebarUsage() {
	const { data } = useQuery(orpc.scs.state.queryOptions());
	if (!data) return null;
	const own = Boolean(data.ownKeyPreview);
	const { used, limit } = data.usage.chat;
	const left = Math.max(0, limit - used);
	const low = !own && left <= 5;
	return (
		<section aria-label="Your free allowance" className="mb-1 rounded-xl border border-white/10 bg-white/[0.06] p-3">
			<div className="flex items-center justify-between text-[12.5px] font-semibold">
				<span>Beta · free</span>
				<span className={low ? "text-[#f5b14c]" : "text-[#d2c7f0]"}>{own ? "Own key" : `${left} left today`}</span>
			</div>
			{!own && (
				<div className="mt-2 h-1 overflow-hidden rounded-full bg-white/15" aria-hidden>
					<div
						className={cn("h-full rounded-full transition-[width] duration-300", low ? "bg-[#f5b14c]" : "bg-[#8b6cf0]")}
						style={{ width: `${limit ? (left / limit) * 100 : 0}%` }}
					/>
				</div>
			)}
			<Link
				to="/dashboard/settings/privacy"
				className={cn(
					"mt-3 flex h-9 w-full items-center justify-center rounded-[10px] text-[13px] font-semibold transition-colors",
					low
						? "bg-[#6c3cf1] text-white shadow-[0_8px_20px_-8px_rgba(108,60,241,.7)] hover:bg-[#5b2fd8]"
						: "bg-white/10 text-white hover:bg-white/20",
				)}
			>
				Invite friends · get more
			</Link>
		</section>
	);
}

/** A guest has no name to draw initials from: the account row shows a person instead (E1). */
function AccountMark({ name, guest }: { name: string; guest: boolean }) {
	return guest ? <Icon name="user" size={18} /> : getInitials(name);
}

function NavLink({ item, current, collapsed }: { item: NavItem; current: boolean; collapsed: boolean }) {
	return (
		<Link
			to={item.to}
			title={collapsed ? item.label : undefined}
			aria-label={collapsed ? item.label : undefined}
			aria-current={current ? "page" : undefined}
			className={cn(row, "h-10 rounded-[9px]", current ? navActive : navIdle, collapsed && "justify-center px-0")}
		>
			<Icon name={item.icon} filled={false} />
			{!collapsed && item.label}
			{!collapsed && item.badge ? (
				// The pill's padding hangs into the row's own padding, so its digit ends on the same edge as the counts.
				<span className={cn(badge, "ms-auto -me-[5px]")}>{i18n.number(item.badge)}</span>
			) : !collapsed && item.count ? (
				<span className={cn(count, "text-[#d2c7f0]")}>{i18n.number(item.count)}</span>
			) : null}
		</Link>
	);
}

const railButton =
	"relative grid size-10 place-items-center rounded-md transition-[background-color,color,scale] duration-quick ease-enter active:scale-[0.97]";

/** Tablets: the same places as icons, with their names (and counts) in tooltips. */
function Rail() {
	const { t } = useLingui();
	const { session } = useRouteContext({ from: "/dashboard" });
	const { items, trash } = useNavItems();
	const isCurrent = useIsCurrent();
	const openPalette = useCommandPaletteStore((state) => state.setOpen);

	const place = (item: NavItem) => {
		const current = isCurrent(item.to);
		return (
			<RailTip
				key={item.to}
				label={item.label}
				icon={item.icon}
				filled={current}
				count={item.count}
				waiting={item.badge}
			>
				<Link
					to={item.to}
					aria-label={
						item.badge
							? t`${item.label}, ${plural(item.badge, { one: "# waiting", other: "# waiting" })}`
							: item.count
								? t`${item.label}, ${plural(item.count, { one: "#", other: "#" })}`
								: item.label
					}
					aria-current={current ? "page" : undefined}
					className={cn(railButton, current ? "bg-accent-soft text-accent-text" : idle)}
				/>
			</RailTip>
		);
	};

	return (
		<nav
			data-design="side"
			aria-label={t`Main`}
			className="sticky top-0 flex h-svh flex-col items-center gap-1 border-e border-line bg-bg pt-4 pb-3 [view-transition-name:app-nav]"
		>
			<Link to="/" aria-label="Student Career Studio" className="mb-2 grid size-9 place-items-center rounded-md">
				<BrandIcon variant="icon" alt="" className="size-6" />
			</Link>
			<RailTip label={t`Search or jump to…`} icon="magnifying-glass">
				<button
					type="button"
					data-design="srch"
					aria-label={t`Search or jump to…`}
					onClick={() => openPalette(true)}
					className={cn(railButton, idle, "mb-1")}
				/>
			</RailTip>
			{items.map(place)}
			<div className="flex-1" />
			{place(trash)}
			<RailTip label={t`Shortcuts`} icon="keyboard">
				<button
					type="button"
					id="keyboard-shortcuts-trigger"
					aria-label={t`Shortcuts`}
					onClick={(event) => showKeyboardShortcuts(event.currentTarget)}
					className={cn(railButton, idle)}
				/>
			</RailTip>
			<Tooltip>
				<TooltipTrigger
					render={
						<Link
							to="/dashboard/settings"
							data-design="acct"
							aria-label={t`Settings`}
							className="mt-1 grid size-10 place-items-center rounded-md"
						/>
					}
				>
					<Avatar className="after:hidden">
						<AvatarImage src={session.user.image ?? undefined} alt="" />
						<AvatarFallback className="bg-accent-soft text-accent-text">
							<AccountMark name={session.user.name} guest={!!session.user.isAnonymous} />
						</AvatarFallback>
					</Avatar>
				</TooltipTrigger>
				<TooltipContent side="right">
					<Trans>Settings</Trans>
				</TooltipContent>
			</Tooltip>
		</nav>
	);
}

type RailTipProps = {
	label: string;
	icon: IconName;
	filled?: boolean;
	/** Said in the tooltip after the name. */
	count?: number | undefined;
	/** Drawn on the icon's corner. */
	waiting?: number | undefined;
	children: ReactElement;
};

/** A rail button: its icon inside the given trigger, and its name in a tooltip. */
function RailTip({ label, icon, filled = false, count: value, waiting, children }: RailTipProps) {
	return (
		<Tooltip>
			<TooltipTrigger render={children}>
				<Icon name={icon} filled={filled} />
				{waiting ? <span className={cn(badge, "absolute -end-1 -top-1")}>{i18n.number(waiting)}</span> : null}
			</TooltipTrigger>
			<TooltipContent side="right">
				{label}
				{value ? <span className="ms-2 font-mono text-xs opacity-70">{i18n.number(value)}</span> : null}
			</TooltipContent>
		</Tooltip>
	);
}

/** Phones: Today · Documents · Applications · Career. Search and the account are in each page's header. */
function MobileTabs() {
	const { t } = useLingui();
	const { items } = useNavItems();
	const isCurrent = useIsCurrent();

	return (
		<nav
			aria-label={t`Main`}
			className="sticky bottom-0 z-30 grid min-h-16 auto-cols-fr grid-flow-col border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] [view-transition-name:app-nav]"
		>
			{items.map(({ to, icon, label, short, badge: waiting }) => {
				const current = isCurrent(to);
				return (
					<Link
						key={to}
						to={to}
						aria-current={current ? "page" : undefined}
						viewTransition={false}
						className={cn(
							"relative flex min-h-[63px] min-w-0 flex-col items-center justify-center gap-0.5 text-center text-xs [overflow-wrap:anywhere] transition-[scale] duration-quick ease-enter active:scale-[0.97]",
							current ? "font-semibold text-accent-text" : "font-medium text-ink-2",
						)}
					>
						{current && <MobileTabIndicator />}
						<Icon name={icon} size={24} filled={current} />
						{short ?? label}
						{waiting ? (
							<span className={cn(badge, "absolute start-[calc(50%+7px)] top-1.5")}>{i18n.number(waiting)}</span>
						) : null}
					</Link>
				);
			})}
		</nav>
	);
}
