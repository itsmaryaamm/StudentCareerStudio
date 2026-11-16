import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { toast } from "@reactive-resume/ui/components/toast";
import { studioErrorText, useStudioState } from "./shared";
import { orpc } from "@/libs/orpc/client";

/** Optional: use the student's own Google Gemini key, so the coach has no daily limit and doesn't use the shared quota. */
export function OwnKeyCard() {
	const { data } = useStudioState();
	const queryClient = useQueryClient();
	const [key, setKey] = useState("");
	const refresh = () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() });
	const save = useMutation({
		...orpc.scs.setOwnKey.mutationOptions(),
		onSuccess: async () => {
			setKey("");
			await refresh();
			toast.add({ description: "Your Gemini key is saved. The coach now uses it." });
		},
	});
	const clear = useMutation({
		...orpc.scs.clearOwnKey.mutationOptions(),
		onSuccess: async () => {
			await refresh();
			toast.add({ description: "Your key was removed. The coach uses the shared allowance again." });
		},
	});
	const preview = data?.ownKeyPreview;

	return (
		<section aria-labelledby="own-key" className="rounded-xl border border-line bg-raised p-4">
			<h2 id="own-key" className="text-base font-semibold">
				Use your own Gemini key (optional)
			</h2>
			<p className="mt-1 text-sm text-ink-2">
				Run out of free messages, or want no daily limit? Paste a free key from Google AI Studio. Chat, LinkedIn and
				document reading then use your own Google quota instead of the shared one. Your messages go to Google under your
				key's terms. The key is stored encrypted, never shown again, and never included in downloads.
			</p>
			{preview ? (
				<div className="mt-3 flex flex-wrap items-center gap-3">
					<span className="text-sm" role="status">
						Using your key <code>{preview}</code>. No daily limit from us.
					</span>
					<Button variant="secondary" disabled={clear.isPending} onClick={() => clear.mutate({})}>
						Remove key
					</Button>
				</div>
			) : (
				<form
					className="mt-3 grid gap-2 sm:max-w-md"
					onSubmit={(e) => {
						e.preventDefault();
						if (key.trim()) save.mutate({ apiKey: key });
					}}
				>
					<label htmlFor="own-key-input" className="text-[13px]">
						Gemini API key
					</label>
					<Input
						id="own-key-input"
						type="password"
						autoComplete="off"
						spellCheck={false}
						placeholder="AIza…"
						value={key}
						onChange={(e) => setKey(e.target.value)}
					/>
					<div className="flex flex-wrap items-center gap-3">
						<Button type="submit" disabled={save.isPending || !key.trim()} aria-busy={save.isPending}>
							{save.isPending ? "Checking with Google…" : "Check and save"}
						</Button>
						<a
							href="https://aistudio.google.com/apikey"
							target="_blank"
							rel="noreferrer"
							className="text-sm text-accent-text underline"
						>
							Get a free key
						</a>
					</div>
					{save.error && (
						<p role="alert" className="text-sm text-danger-text">
							{studioErrorText(save.error, "Couldn't save the key.")}
						</p>
					)}
				</form>
			)}
		</section>
	);
}
