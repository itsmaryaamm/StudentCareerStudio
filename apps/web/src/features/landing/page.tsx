import { useNavigate } from "@tanstack/react-router";
import { Hero } from "./hero";
import { stashSentence } from "./hooks";
import { FloatingNav } from "./nav";
import { PhoneBottomBar, PhoneTopBar } from "./phone";
import { Closing, Faq, Footer, HowItWorks, Services, StartPanel, Trust } from "./sections";

/**
 * The signed-out homepage. Light-only on purpose: its own palette, the Figtree face and a floating nav that appears
 * after the hero. Below 760px it becomes the phone layout: a sticky top bar, a bottom bar with Menu and Start free, and snap carousels.
 */
export function LandingPage() {
	const navigate = useNavigate();
	return (
		<div className="scs-landing relative isolate min-h-screen overflow-x-clip">
			<a
				href="#main"
				className="fixed top-2.5 left-4 z-100 -translate-y-[160%] rounded-md bg-[#1A0B3B] px-3.5 py-2.5 text-sm font-semibold text-white focus:translate-y-0"
			>
				Skip to content
			</a>
			<PhoneTopBar />
			<FloatingNav />
			<Hero />
			<main id="main">
				<HowItWorks />
				<Services />
				<Trust />
				<StartPanel
					onStart={(sentence) => {
						if (sentence) stashSentence(sentence);
						void navigate({ to: "/auth/register" });
					}}
				/>
				<Faq />
				<Closing />
			</main>
			<Footer />
			<PhoneBottomBar />
		</div>
	);
}
