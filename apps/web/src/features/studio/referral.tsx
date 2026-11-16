import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { toast } from "@reactive-resume/ui/components/toast";
import { copyText, studioErrorText, useStudioState } from "./shared";
import { orpc } from "@/libs/orpc/client";

/** Share a code with friends. When a friend joins with it, both get a bigger free allowance. */
export function ReferralCard() {
	const { data } = useStudioState();
	const queryClient = useQueryClient();
	const [code, setCode] = useState("");
	const use = useMutation({
		...orpc.scs.useFriendCode.mutationOptions(),
		onSuccess: async () => {
			setCode("");
			await queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() });
			toast.add({ description: "Done. Your allowance just went up." });
		},
	});
	const r = data?.referral;
	if (!r) return null;
	const link = `${window.location.origin}/auth/register?ref=${r.code}`;
	const copy = async (text: string, what: string) =>
		toast.add(
			(await copyText(text))
				? { description: `${what} copied.` }
				: { type: "error", description: "Couldn't copy. Select it and copy by hand." },
		);

	return (
		<section aria-labelledby="friends" className="rounded-xl border border-line bg-raised p-4">
			<h2 id="friends" className="text-base font-semibold">
				Invite friends, get more free AI
			</h2>
			<p className="mt-1 text-sm text-ink-2">
				When a friend signs up with your code, they get +{r.forFriendChat} messages a day and +{r.forFriendUploads}{" "}
				document reads, and you get +{r.perFriendChat} messages a day and +{r.perFriendUploads} document read for each
				friend (up to {r.maxFriends} friends).
			</p>
			<div className="mt-3 flex flex-wrap items-center gap-2">
				<code className="rounded-md bg-sunken px-3 py-2 text-base font-semibold tracking-widest">{r.code}</code>
				<Button variant="secondary" onClick={() => void copy(r.code, "Code")}>
					Copy code
				</Button>
				<Button variant="secondary" onClick={() => void copy(link, "Link")}>
					Copy invite link
				</Button>
			</div>
			<p className="mt-2 text-[13px] text-ink-3" role="status">
				{r.friends} {r.friends === 1 ? "friend has" : "friends have"} joined with your code
				{r.chatBonus > 0 ? ` · bonus now +${r.chatBonus} messages a day, +${r.uploadBonus} document reads` : ""}.
			</p>
			{!r.joinedWithCode && (
				<form
					className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3"
					onSubmit={(e) => {
						e.preventDefault();
						if (code.trim()) use.mutate({ code });
					}}
				>
					<div className="grid gap-1">
						<label htmlFor="friend-code" className="text-[13px]">
							Got a friend's code?
						</label>
						<Input
							id="friend-code"
							autoComplete="off"
							className="uppercase"
							value={code}
							onChange={(e) => setCode(e.target.value)}
						/>
					</div>
					<Button type="submit" disabled={use.isPending || !code.trim()}>
						{use.isPending ? "Checking…" : "Use code"}
					</Button>
					{use.error && (
						<p role="alert" className="w-full text-sm text-danger-text">
							{studioErrorText(use.error, "Couldn't use that code.")}
						</p>
					)}
				</form>
			)}
		</section>
	);
}
