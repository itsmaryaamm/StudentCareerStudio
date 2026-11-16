import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@reactive-resume/ui/components/dialog";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { useFeedbackDialog } from "./feedback-store";
import { studioErrorText } from "./shared";
import { orpc } from "@/libs/orpc/client";

const CATEGORIES = [
	{ id: "idea", label: "Idea" },
	{ id: "bug", label: "Bug" },
	{ id: "other", label: "Other" },
] as const;
const RATING_LABEL = ["", "Poor", "Fair", "Okay", "Good", "Loved it"];
const PLACEHOLDER = {
	idea: "What's on your mind?",
	bug: "What went wrong? What did you expect to happen?",
	other: "What's on your mind?",
} as const;

/** The sidebar link. The dialog itself lives in <FeedbackHost />, so anything can open it. */
export function FeedbackButton({
	className,
	variant = "ghost",
}: {
	className?: string;
	variant?: "ghost" | "secondary";
}) {
	const setOpen = useFeedbackDialog((s) => s.setOpen);
	return (
		<Button variant={variant} className={className} onClick={() => setOpen(true)}>
			Send feedback
		</Button>
	);
}

function Star({ filled }: { filled: boolean }) {
	return (
		<svg
			width="32"
			height="32"
			viewBox="0 0 24 24"
			aria-hidden
			fill={filled ? "#e0a526" : "none"}
			stroke={filled ? "#e0a526" : "#b9a9ec"}
			strokeWidth={1.7}
			strokeLinejoin="round"
		>
			<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z" />
		</svg>
	);
}

/** Mounted once in the app shell. Closes with the X, Cancel or Escape; a sent message shows a short thank-you. */
export function FeedbackHost() {
	const open = useFeedbackDialog((s) => s.open);
	const setOpen = useFeedbackDialog((s) => s.setOpen);
	const [rating, setRating] = useState(0);
	const [hover, setHover] = useState(0);
	const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("idea");
	const [message, setMessage] = useState("");
	const submit = useMutation({
		...orpc.scs.feedback.submit.mutationOptions(),
		onSuccess: () => {
			toast.add({ description: "Thanks, feedback sent" });
			setOpen(false);
			setMessage("");
			setRating(0);
		},
	});
	const shown = hover || rating;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent
				closeLabel="Close"
				className="max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-[460px]"
			>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (rating) submit.mutate({ rating, category, message, page: window.location.pathname });
					}}
				>
					<DialogHeader>
						<DialogTitle className="text-[22px] font-bold tracking-tight">How's it going?</DialogTitle>
						<DialogDescription>
							Rate your experience, then tell us what's confusing, broken or missing.
						</DialogDescription>
					</DialogHeader>
					<fieldset className="mt-4" onMouseLeave={() => setHover(0)}>
						<legend className="sr-only">Rating out of 5</legend>
						<div
							className="flex items-center gap-1"
							role="radiogroup"
							tabIndex={-1}
							aria-label="Rating out of 5"
							onMouseLeave={() => setHover(0)}
						>
							{[1, 2, 3, 4, 5].map((n) => (
								<button
									key={n}
									type="button"
									role="radio"
									aria-checked={rating === n}
									aria-label={`${n} out of 5`}
									onMouseEnter={() => setHover(n)}
									onClick={() => setRating(n)}
									className="grid size-11 place-items-center rounded-lg transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-[#6c3cf1]"
								>
									<Star filled={shown >= n} />
								</button>
							))}
							<span className="ms-2 text-sm font-medium text-ink-2" aria-live="polite">
								{RATING_LABEL[shown]}
							</span>
						</div>
					</fieldset>
					<fieldset className="mt-3 flex flex-wrap gap-2">
						<legend className="sr-only">Kind of feedback</legend>
						{CATEGORIES.map((c) => (
							<label
								key={c.id}
								className={cn(
									"min-h-10 cursor-pointer rounded-full border px-4 py-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#6c3cf1]",
									category === c.id
										? "border-[#6c3cf1] bg-[#6c3cf1] text-white"
										: "border-[#ddd5f2] bg-white hover:border-[#c4b2f5]",
								)}
							>
								<input
									type="radio"
									name="fb-cat"
									className="sr-only"
									checked={category === c.id}
									onChange={() => setCategory(c.id)}
								/>
								{c.label}
							</label>
						))}
					</fieldset>
					<label htmlFor="fb-message" className="sr-only">
						Your message
					</label>
					<Textarea
						id="fb-message"
						rows={5}
						required
						minLength={3}
						maxLength={2000}
						placeholder={PLACEHOLDER[category]}
						className="mt-3 rounded-xl border-[#ddd5f2] text-[15px]"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
					{submit.error != null && (
						<p role="alert" className="mt-2 text-sm text-danger-text">
							{studioErrorText(submit.error)}
						</p>
					)}
					<DialogFooter className="mt-4">
						<Button type="button" variant="secondary" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!rating || message.trim().length < 3 || submit.isPending}
							aria-busy={submit.isPending}
						>
							{submit.isPending ? "Sending…" : "Send"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
