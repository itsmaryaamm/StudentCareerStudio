import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Link, Outlet } from "@tanstack/react-router";
import { BrandWordmark } from "@/components/brand-wordmark";

const paper = "absolute h-[600px] w-[400px] overflow-hidden rounded-paper bg-paper shadow-page";

/**
 * Every sign-in page is the same left half: the logo where the app sidebar has it, one 380px column, one title size.
 * From 1280 the second half shows what the product makes.
 */
export function AuthLayout() {
	return (
		<div className="flex min-h-svh bg-bg">
			<div className="relative flex min-w-0 flex-1 flex-col items-center justify-center py-15">
				<Link
					to="/"
					className="absolute start-5 top-3 flex items-center gap-2.5 rounded-md px-2 text-[15px] leading-5 font-semibold [view-transition-name:auth-brand]"
				>
					<BrandWordmark variant="light" className="h-11" />
				</Link>

				<div className="flex w-full max-w-[412px] flex-col px-4">
					<Outlet />
				</div>
			</div>

			<aside className="sticky top-0 hidden h-svh min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#7c4df5_0%,#4b1d96_55%,#240a55_100%)] text-white xl:flex">
				<div className="flex h-[540px] items-start justify-center [@media(max-height:680px)]:h-[285px] [@media(max-height:800px)]:h-[355px] [@media(max-height:940px)]:h-[445px]">
					<div
						role="img"
						aria-label={t`Two résumés made in Student Career Studio`}
						className="relative h-[670px] w-[640px] origin-top scale-[.8] [@media(max-height:680px)]:scale-[.42] [@media(max-height:800px)]:scale-[.52] [@media(max-height:940px)]:scale-[.66]"
					>
						<div data-design="paper" className={`${paper} start-0 top-0 -rotate-2 rtl:rotate-2`}>
							<MockResume />
						</div>
						<div data-design="paper" className={`${paper} end-0 bottom-0`}>
							<MockResume sidebar />
						</div>
					</div>
				</div>
				<p className="mt-9 max-w-[620px] px-8 text-center text-[34px] leading-[1.15] font-bold tracking-[-0.03em] text-balance">
					<Trans>Tell your story once. Use it for your résumé and LinkedIn.</Trans>
				</p>
				<p className="pt-2 text-center text-[15px] text-[#d9ccff]">
					<Trans>Beta for 50 students. Your résumé stays private to you.</Trans>
				</p>
			</aside>
		</div>
	);
}

const line = "h-[7px] rounded-full bg-[#e3e0ee]";

/** A résumé drawn in plain boxes: a name, no photo and no one's real details. */
function MockResume({ sidebar = false }: { sidebar?: boolean }) {
	const block = (title: string, widths: string[]) => (
		<div className="mt-6">
			<div className="text-[11px] font-bold tracking-wider text-[#4b1d96] uppercase">{title}</div>
			<div className="mt-2 h-px bg-[#d9d4ea]" />
			<div className="mt-3 space-y-2">
				{widths.map((w, i) => (
					<div key={i} className={line} style={{ width: w }} />
				))}
			</div>
		</div>
	);
	return (
		<div aria-hidden className="flex size-full text-[#1c1530]">
			{sidebar && (
				<div className="w-[34%] bg-[#f1edfb] px-5 pt-10">
					{block("Skills", ["90%", "70%", "80%", "60%"])}
					{block("Languages", ["65%", "55%"])}
				</div>
			)}
			<div className="min-w-0 flex-1 px-8 pt-10">
				<div className="text-[26px] leading-none font-bold tracking-tight">Your Name</div>
				<div className="mt-2 text-[12px] text-[#6b6485]">Student · your.name@email.com · City</div>
				{block("Summary", ["100%", "96%", "70%"])}
				{block("Experience", ["55%", "100%", "92%", "85%", "50%", "98%", "88%"])}
				{block("Education", ["60%", "80%", "45%"])}
				{!sidebar && block("Skills", ["75%", "60%"])}
			</div>
		</div>
	);
}
