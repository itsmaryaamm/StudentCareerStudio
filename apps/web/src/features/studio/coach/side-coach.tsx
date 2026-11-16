import { useLocation } from "@tanstack/react-router";
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
	const [open, setOpen] = useState(true);
	const { pathname } = useLocation();
	// The full-page chat already is the coach.
	if (pathname.startsWith("/dashboard/chat")) return <>{children}</>;

	return (
		<>
			<div className={cn("min-w-0", open && "lg:pe-[380px]")}>{children}</div>
			{open ? (
				<aside
					aria-label="Career coach"
					className="fixed inset-y-0 inset-e-0 z-40 flex w-full flex-col gap-2 border-s border-line bg-bg p-3 sm:w-[380px]"
				>
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold">Career coach</h2>
						<Button variant="ghost" size="icon" aria-label="Hide the career coach" onClick={() => setOpen(false)}>
							<Icon name="x" size={16} />
						</Button>
					</div>
					<div className="min-h-0 flex-1">
						<ChatPage compact />
					</div>
				</aside>
			) : (
				<Button className="fixed inset-e-4 bottom-4 z-40 shadow-lg" onClick={() => setOpen(true)}>
					<Icon name="sparkle" size={16} /> Career coach
				</Button>
			)}
		</>
	);
}
