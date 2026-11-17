import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "@reactive-resume/ui/components/toast";
import { authErrorMessage } from "../error";
import { getAuthRedirectOptions } from "../redirect";
import { authClient } from "@/libs/auth/client";
import { orpc } from "@/libs/orpc/client";
import { sessionQueryKey } from "@/libs/root-context";

// Google's "Sign in with Google" (Google Identity Services): their own button, which also works in iOS and Android
// browsers, and an ID token we verify on the server. https://developers.google.com/identity/gsi/web
type Credential = { credential: string };
type GoogleId = {
	initialize: (config: Record<string, unknown>) => void;
	renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
	prompt: () => void;
	cancel: () => void;
};
declare global {
	interface Window {
		google?: { accounts: { id: GoogleId } };
	}
}

const SCRIPT = "https://accounts.google.com/gsi/client";
let loading: Promise<void> | null = null;
const loadGoogle = () =>
	(loading ??= new Promise<void>((resolve, reject) => {
		if (window.google?.accounts) return resolve();
		const el = document.createElement("script");
		el.src = SCRIPT;
		el.async = true;
		el.onload = () => resolve();
		el.onerror = () => {
			loading = null;
			reject(new Error("Couldn't load Google sign-in."));
		};
		document.head.append(el);
	}));

const nonce = () =>
	Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

type Props = {
	/** A friend's code (sign-up page), sent with the sign-in so a new account gets the bonus. */
	friendCode?: string;
	/** Offer Google's one-tap prompt as well as the button. */
	oneTap?: boolean;
	callbackURL?: string | undefined;
};

/** Renders Google's button when this server has a Google client ID; renders nothing otherwise. */
export function GoogleSignInButton({ friendCode = "", oneTap = false, callbackURL }: Props) {
	const { data: info } = useQuery(orpc.scs.beta.queryOptions());
	const clientId = info?.googleClientId;
	const box = useRef<HTMLDivElement>(null);
	const queryClient = useQueryClient();
	const router = useRouter();
	const friend = useRef(friendCode);
	useEffect(() => {
		friend.current = friendCode;
	}, [friendCode]);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (!clientId || !box.current) return;
		let cancelled = false;
		const expected = nonce();
		void loadGoogle()
			.then(() => {
				if (cancelled || !box.current || !window.google) return;
				const id = window.google.accounts.id;
				id.initialize({
					client_id: clientId,
					nonce: expected,
					use_fedcm_for_prompt: true,
					auto_select: false,
					callback: async ({ credential }: Credential) => {
						const toastId = toast.add({ type: "loading", description: "Signing in…" });
						const { error } = await authClient.signIn.social({
							provider: "google",
							idToken: { token: credential, nonce: expected },
							callbackURL: callbackURL ?? "/dashboard",
							...(friend.current.trim()
								? { fetchOptions: { headers: { "x-referral-code": friend.current.trim() } } }
								: {}),
						});
						if (error) {
							toast.add({
								type: "error",
								description: `${authErrorMessage(error, "Couldn't sign in with Google. Try again.")}${error.code ? ` (${error.code})` : ""}`,
								id: toastId,
							});
							return;
						}
						toast.close(toastId);
						await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
						await router.invalidate();
						void router.navigate(getAuthRedirectOptions(callbackURL));
					},
				});
				id.renderButton(box.current, {
					type: "standard",
					theme: "outline",
					size: "large",
					text: "continue_with",
					shape: "rectangular",
					logo_alignment: "left",
					width: Math.min(400, box.current.clientWidth || 320),
				});
				if (oneTap) id.prompt();
			})
			.catch(() => setFailed(true));
		return () => {
			cancelled = true;
			window.google?.accounts.id.cancel();
		};
	}, [clientId, oneTap, callbackURL, queryClient, router]);

	if (!clientId || failed) return null;
	return <div ref={box} className="col-span-2 flex min-h-11 justify-center" data-testid="google-signin" />;
}
