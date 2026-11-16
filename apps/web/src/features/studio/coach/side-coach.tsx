import { Link, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { cn } from "@reactive-resume/utils/style";
import { ChatPage } from "../chat";

/**
 * The career coach beside the dashboard, instead of a page of its own. On wide screens it sits in a column that the
 * page makes room for; on phones it is a button that opens it over the page.
 */
export function SideCoach({ children }: { children: React.ReactNode }) {
	// Open beside the page on wide screens; on a phone it would cover the page, so it starts as a button.
	const [open, setOpen] = useState(
		() => typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches,
	);
	const { pathname } = useLocation();
	// The full-page chat already is the coach.
	// The coach sits beside the dashboard and LinkedIn Studio only; elsewhere pages keep their full width.
	if (pathname !== "/dashboard" && !pathname.startsWith("/dashboard/linkedin")) return <>{children}</>;

	return (
		<>
			<div className={cn("min-w-0", open && "lg:pe-[320px]")}>{children}</div>
			{open ? (
				<aside
					aria-label="Career coach"
					className="fixed inset-y-0 inset-e-0 z-40 flex w-full flex-col gap-2 border-s border-line bg-bg p-3 max-md:hidden sm:w-[320px]"
				>
					<div className="flex items-center justify-between gap-2">
						<h2 className="flex items-center gap-2 text-[15px] font-semibold">
							<Icon name="sparkle" size={16} className="text-accent" /> Career coach
						</h2>
						<span className="flex items-center gap-1">
							<Link to="/dashboard/chat" className="text-[13px] font-semibold text-accent hover:underline">
								Open full chat
							</Link>
							<Button variant="ghost" size="icon" aria-label="Hide the career coach" onClick={() => setOpen(false)}>
								<Icon name="x" size={16} />
							</Button>
						</span>
					</div>
					<div className="min-h-0 flex-1">
						<ChatPage compact />
					</div>
				</aside>
			) : (
				<Button
					className="fixed inset-e-4 bottom-24 z-40 shadow-lg max-md:hidden lg:bottom-4"
					onClick={() => setOpen(true)}
				>
					<Icon name="sparkle" size={16} /> Career coach
				</Button>
			)}
		</>
	);
}
