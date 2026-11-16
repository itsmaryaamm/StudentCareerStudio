import type { IconName } from "@reactive-resume/ui/components/icon";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { Icon } from "@reactive-resume/ui/components/icon";
import { useFeedbackDialog } from "./feedback-store";
import { ProfilePanel } from "./profile";
import { useSignOut } from "@/features/user/sign-out";
import { orpc } from "@/libs/orpc/client";

const row =
	"flex min-h-14 w-full items-center gap-3 rounded-2xl border border-[#e8e3f5] bg-white px-4 text-start text-[15px] font-medium text-[#1a0b3b] transition hover:border-[#c4b2f5] active:scale-[.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1]";

function Tile({ icon }: { icon: IconName }) {
	return (
		<span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[#ede9fe] text-[#6c3cf1]">
			<Icon name={icon} size={18} />
		</span>
	);
}

/** The phone's "More" tab: the places that don't fit in the tab bar, and the career profile. */
export function MoreScreen() {
	const { session } = useRouteContext({ from: "/dashboard" });
	const signOut = useSignOut();
	const openFeedback = useFeedbackDialog((s) => s.setOpen);
	const { data: state } = useQuery(orpc.scs.state.queryOptions());
	const left = state ? Math.max(0, state.usage.chat.limit - state.usage.chat.used) : null;

	return (
		<div className="mt-4 grid gap-3 pb-6">
			<div className="flex items-center gap-3 rounded-2xl border border-[#e8e3f5] bg-white p-4">
				<span
					aria-hidden
					className="grid size-12 shrink-0 place-items-center rounded-full bg-[#6c3cf1] font-semibold text-white"
				>
					{session.user.name
						.split(/\s+/)
						.filter(Boolean)
						.slice(0, 2)
						.map((w: string) => w[0]?.toUpperCase())
						.join("")}
				</span>
				<div className="min-w-0">
					<p className="truncate font-semibold text-[#1a0b3b]">{session.user.name}</p>
					<p className="truncate text-sm text-[#6b6585]">{session.user.email}</p>
				</div>
			</div>

			<section aria-labelledby="more-profile" className="rounded-2xl border border-[#e8e3f5] bg-white p-4">
				<h2 id="more-profile" className="sr-only">
					Your career profile
				</h2>
				<ProfilePanel />
			</section>

			<nav aria-label="More" className="grid gap-2.5">
				<Link to="/dashboard/documents" className={row}>
					<Tile icon="files" />
					My résumés
				</Link>
				<Link to="/dashboard/settings" className={row}>
					<Tile icon="gear-six" />
					Settings
				</Link>
				<Link to="/dashboard/settings/privacy" className={row}>
					<Tile icon="user-plus" />
					<span className="flex-1">Invite friends</span>
					{left != null && <span className="text-sm text-[#6b6585]">{left} left today</span>}
				</Link>
				<button type="button" className={row} onClick={() => openFeedback(true)}>
					<Tile icon="chat-text" />
					Send feedback
				</button>
				<button type="button" className={row} onClick={() => void signOut()}>
					<Tile icon="sign-out" />
					Sign out
				</button>
			</nav>
		</div>
	);
}
