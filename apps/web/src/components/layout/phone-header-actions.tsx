import type { ReactNode } from "react";
import { useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@reactive-resume/ui/components/avatar";
import { Icon } from "@reactive-resume/ui/components/icon";
import { getInitials } from "@reactive-resume/utils/string";
import { cn } from "@reactive-resume/utils/style";
import { useCommandPaletteStore } from "@/features/command-palette/store";
import { orpc } from "@/libs/orpc/client";

type PhoneHeaderActionsProps = {
	className?: string;
	/** Page action between search and account, preserving visual and keyboard order. */
	children?: ReactNode;
	/** The shell's own copy, shown only while the page hasn't placed one in its header. */
	fallback?: boolean;
};

/**
 * Phones have no sidebar, so search and the account sit at the end of each page's header (board M1). Place this last
 * in the header's actions; it shows under 640px only. A page that hasn't placed it gets the shell's copy above its
 * content instead.
 */
export function PhoneHeaderActions({ className, fallback = false, children }: PhoneHeaderActionsProps) {
	const { t } = useLingui();
	const { session } = useRouteContext({ strict: false });
	const openPalette = useCommandPaletteStore((state) => state.setOpen);
	// How many free messages are left today; tapping it goes to inviting friends or adding a key.
	const { data: studio } = useQuery({ ...orpc.scs.state.queryOptions(), enabled: Boolean(session) });
	const pill = studio
		? studio.ownKeyPreview
			? "Own key"
			: `${Math.max(0, studio.usage.chat.limit - studio.usage.chat.used)} left today`
		: null;

	return (
		<div
			data-phone-header-actions={fallback ? "fallback" : "page"}
			className={cn("-me-2.5 flex items-center sm:hidden", className)}
		>
			{pill && (
				<Link
					to="/dashboard/settings/privacy"
					className="me-1 inline-flex h-8 items-center rounded-full bg-[#ede9fe] px-3 text-[12.5px] font-semibold text-[#4b1d96]"
				>
					{pill}
				</Link>
			)}
			<button
				type="button"
				aria-label={t`Search or jump to…`}
				onClick={() => openPalette(true)}
				className="grid size-11 place-items-center rounded-md text-ink-2 transition-colors active:bg-press"
			>
				<Icon name="magnifying-glass" size={24} />
			</button>
			{children}
			<Link
				to="/dashboard/settings"
				aria-label={t`Settings`}
				className="grid size-11 place-items-center rounded-md transition-colors active:bg-press"
			>
				<Avatar className="after:hidden">
					<AvatarImage src={session?.user.image ?? undefined} alt="" />
					<AvatarFallback className="bg-accent-soft text-accent-text">
						{getInitials(session?.user.name ?? "")}
					</AvatarFallback>
				</Avatar>
			</Link>
		</div>
	);
}
