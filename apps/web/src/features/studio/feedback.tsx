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
	DialogTrigger,
} from "@reactive-resume/ui/components/dialog";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { studioErrorText } from "./shared";
import { orpc } from "@/libs/orpc/client";

const CATEGORIES = [
	{ id: "bug", label: "Something broke" },
	{ id: "idea", label: "I have an idea" },
	{ id: "praise", label: "Something worked well" },
	{ id: "other", label: "Other" },
] as const;

export function FeedbackButton({
	className,
	variant = "ghost",
}: {
	className?: string;
	variant?: "ghost" | "secondary";
}) {
	const [open, setOpen] = useState(false);
	const [rating, setRating] = useState(0);
	const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("idea");
	const [message, setMessage] = useState("");
	const submit = useMutation({
		...orpc.scs.feedback.submit.mutationOptions(),
		onSuccess: () => {
			toast.add({ description: "Thank you — we read every message." });
			setOpen(false);
			setMessage("");
			setRating(0);
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant={variant} className={className} />}>Send feedback</DialogTrigger>
			<DialogContent closeLabel="Close">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						if (rating) submit.mutate({ rating, category, message, page: window.location.pathname });
					}}
				>
					<DialogHeader>
						<DialogTitle>Help us improve</DialogTitle>
						<DialogDescription>
							You're one of our first 50 students. Tell us what's working and what isn't.
						</DialogDescription>
					</DialogHeader>
					<fieldset className="mt-3">
						<legend className="text-sm font-medium">How is it going?</legend>
						<div className="mt-1 flex gap-1" role="radiogroup" aria-label="Rating out of 5">
							{[1, 2, 3, 4, 5].map((n) => (
								<button
									key={n}
									type="button"
									role="radio"
									aria-checked={rating === n}
									aria-label={`${n} out of 5`}
									onClick={() => setRating(n)}
									className={cn(
										"size-11 rounded-md border text-base",
										rating >= n ? "border-accent bg-accent-soft text-accent-text" : "border-line text-ink-3",
									)}
								>
									★
								</button>
							))}
						</div>
					</fieldset>
					<fieldset className="mt-3 flex flex-wrap gap-2">
						<legend className="sr-only">Kind of feedback</legend>
						{CATEGORIES.map((c) => (
							<label
								key={c.id}
								className={cn(
									"min-h-10 cursor-pointer rounded-full border px-3 py-2 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
									category === c.id ? "border-accent bg-accent-soft" : "border-line",
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
					<label htmlFor="fb-message" className="mt-3 grid gap-1 text-sm font-medium">
						Your message
						<Textarea
							id="fb-message"
							rows={4}
							required
							minLength={3}
							maxLength={2000}
							value={message}
							onChange={(e) => setMessage(e.target.value)}
						/>
					</label>
					{submit.error != null && (
						<p role="alert" className="mt-2 text-sm text-danger-text">
							{studioErrorText(submit.error)}
						</p>
					)}
					<DialogFooter className="mt-4">
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
