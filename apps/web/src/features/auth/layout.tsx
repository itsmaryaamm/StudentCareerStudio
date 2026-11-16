import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Link, Outlet } from "@tanstack/react-router";
import { BrandIcon } from "@reactive-resume/ui/components/brand-icon";

const paper = "absolute h-[614px] w-[434px] overflow-hidden rounded-paper bg-paper shadow-page";

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
					className="absolute start-5 top-4 flex h-9 items-center gap-2.5 rounded-md px-2 text-[15px] leading-5 font-semibold [view-transition-name:auth-brand]"
				>
					<BrandIcon variant="icon" alt="" className="size-6 shrink-0" />
					Student Career Studio
				</Link>

				<div className="flex w-full max-w-[412px] flex-col px-4">
					<Outlet />
				</div>
			</div>

			<aside className="hidden min-w-0 flex-1 flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_30%_20%,#7c4df5_0%,#4b1d96_55%,#240a55_100%)] text-white xl:flex">
				<div
					role="img"
					aria-label={t`Two résumés made in Student Career Studio`}
					className="relative h-[684px] w-[584px] scale-[.82]"
				>
					<div data-design="paper" className={`${paper} start-0 top-0 -rotate-2 rtl:rotate-2`}>
						<img src="/templates/thumb/ditto.webp" alt="" className="size-full object-cover" />
					</div>
					<div data-design="paper" className={`${paper} end-0 bottom-0`}>
						<img src="/templates/thumb/onyx.webp" alt="" className="size-full object-cover" />
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
