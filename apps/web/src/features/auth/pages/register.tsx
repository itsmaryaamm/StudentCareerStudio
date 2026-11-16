import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useSelector } from "@tanstack/react-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext, useRouter, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import z from "zod";
import { Alert } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import { FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@reactive-resume/ui/components/form";
import { Input } from "@reactive-resume/ui/components/input";
import { toast } from "@reactive-resume/ui/components/toast";
import { AuthFoot, AuthTitle } from "../components/auth-page";
import { ConnectingClient } from "../components/connecting-client";
import { GuestTransferNote } from "../components/guest-banner";
import { SocialAuth } from "../components/social-auth";
import { getAuthRedirectOptions, getOAuthSignInOptions, isOAuthRedirect } from "../redirect";
import { PasswordInput } from "@/components/input/password-input";
import { authClient } from "@/libs/auth/client";
import { orpc } from "@/libs/orpc/client";
import { sessionQueryKey } from "@/libs/root-context";
import { useAppForm } from "@/libs/tanstack-form";

const formSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, { error: () => t`Enter your name.` })
		.max(64, { error: () => t`Use 64 characters or fewer.` }),
	// Optional: left empty, the server makes one from the email address.
	username: z
		.string()
		.trim()
		.toLowerCase()
		.pipe(
			z.union([
				z.literal(""),
				z
					.string()
					.min(3, { error: () => t`Use at least 3 characters.` })
					.max(64, { error: () => t`Use 64 characters or fewer.` })
					.regex(/^[a-z0-9._-]+$/, {
						error: () => t`Use only Latin letters a–z, numbers, dots, hyphens and underscores.`,
					}),
			]),
		),
	email: z.email({ error: () => t`Enter a valid email address.` }).toLowerCase(),
	password: z
		.string()
		.min(8, { error: () => t`Use at least 8 characters.` })
		.max(64, { error: () => t`Use 64 characters or fewer.` }),
	// A friend's code, optional: it gives both of you a bigger free allowance.
	friendCode: z.string().trim().max(32),
});

/** A friend's link looks like /auth/register?ref=CODE. */
function friendCodeFromUrl() {
	if (typeof window === "undefined") return "";
	return new URLSearchParams(window.location.search).get("ref")?.slice(0, 32) ?? "";
}

type Props = {
	disableEmailAuth: boolean;
	/** Signing up from a guest session moves the guest's work into the new account. */
	isGuest?: boolean;
};

export function RegisterPage({ disableEmailAuth, isGuest = false }: Props) {
	const { callbackURL, reauthenticate } = useSearch({ from: "/auth" });
	const queryClient = useQueryClient();
	const router = useRouter();
	const navigate = useNavigate();
	// A server without email sends no verification link, so there's nothing to mention.
	const smtpEnabled = useRouteContext({ strict: false }).flags?.smtpEnabled ?? false;
	// The username is made from the email address unless they ask to choose one.
	const [ownUsername, setOwnUsername] = useState(false);
	// With email delivery on, the account exists but must be confirmed before first sign-in.
	const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
	const { data: beta } = useQuery(orpc.scs.beta.queryOptions());
	const betaFull = beta?.seatsLeft === 0;

	const form = useAppForm({
		defaultValues: { name: "", username: "", email: "", password: "", friendCode: friendCodeFromUrl() },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const toastId = toast.add({ type: "loading", description: t`Signing up…` });

			const oauthOptions = getOAuthSignInOptions(callbackURL);
			const createPrompt = new URLSearchParams(oauthOptions.oauth_query).get("prompt")?.split(" ").includes("create");
			const { data, error } = await authClient.signUp.email({
				name: value.name.trim(),
				email: value.email,
				password: value.password,
				// Empty asks the server to make one from the email address.
				username: value.username,
				displayUsername: value.username,
				callbackURL: callbackURL ?? "/dashboard",
				...(!createPrompt ? oauthOptions : {}),
				fetchOptions: { headers: value.friendCode ? { "x-referral-code": value.friendCode } : {} },
			});

			if (error) {
				toast.add({
					type: "error",
					description:
						error.message ||
						t({
							comment: "Fallback toast when account registration fails without a server error message",
							message: "Couldn't create your account. Try again.",
						}),
					id: toastId,
				});
				return;
			}

			if (isOAuthRedirect(data)) return;
			if (createPrompt && oauthOptions.oauth_query) {
				const continuation = await authClient.oauth2.continue({ created: true, oauth_query: oauthOptions.oauth_query });
				if (continuation.error) {
					toast.add({ type: "error", description: continuation.error.message, id: toastId });
					return;
				}
				if (isOAuthRedirect(continuation.data)) return;
			}
			if (smtpEnabled && !data?.token) {
				toast.close(toastId);
				setConfirmEmail(value.email);
				return;
			}
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			await router.invalidate();
			// Straight to the dashboard (or the page that sent them here); verifying the email can wait.
			toast.close(toastId);
			void navigate(getAuthRedirectOptions(callbackURL));
		},
	});

	const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
	const friendCode = useSelector(form.store, (state) => state.values.friendCode);

	if (confirmEmail)
		return (
			<>
				<AuthTitle>
					<Trans>Check your email</Trans>
				</AuthTitle>
				<p className="mt-4 text-sm text-ink-2" role="status">
					<Trans>
						We sent a confirmation link to <strong>{confirmEmail}</strong>. Open it to activate your account, then sign
						in. Check spam if it doesn't arrive in a minute.
					</Trans>
				</p>
				<AuthFoot>
					<Link to="/auth/login" search={{ callbackURL, reauthenticate }}>
						<Trans>Back to sign in</Trans>
					</Link>
				</AuthFoot>
			</>
		);

	return (
		<>
			<AuthTitle>
				{isGuest ? (
					<Trans comment="Title on the registration page for a guest, who is here to keep what they made">
						Keep your work
					</Trans>
				) : (
					<Trans comment="Title on the registration page">Join the beta</Trans>
				)}
			</AuthTitle>
			<ConnectingClient callbackURL={callbackURL} register>
				{isGuest ? (
					<Trans>Create an account and what you made as a guest moves into it.</Trans>
				) : (
					<Trans comment="Reassurance under the registration title, repeating the homepage's promise">
						Free, with no ads.
					</Trans>
				)}
			</ConnectingClient>

			{isGuest && <GuestTransferNote signUp />}

			{!disableEmailAuth && (
				<form
					noValidate
					className={isGuest ? "mt-5 flex flex-col gap-5" : "mt-7 flex flex-col gap-5"}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					{beta && (
						<Alert variant={betaFull ? "warn" : "info"} role="status">
							{betaFull
								? `The beta is full (${beta.maxSeats} students). Thank you for your interest.`
								: `Beta · ${beta.seatsLeft} of ${beta.maxSeats} free seats left.`}
						</Alert>
					)}

					<form.Field name="name">
						{(field) => (
							<FormItem data-route-focus hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans comment="Label for full name input on registration form">Name</Trans>
								</FormLabel>
								<FormControl
									render={
										<Input
											minLength={1}
											maxLength={64}
											autoComplete="section-register name"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						)}
					</form.Field>

					<form.Field name="email">
						{(field) => (
							<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans comment="Label for email input on registration form">Email address</Trans>
								</FormLabel>
								<FormControl
									render={
										<Input
											type="email"
											autoComplete="section-register email"
											className="lowercase"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>
								{!ownUsername && (
									<FormDescription>
										<Trans>
											Your username is made from your email.{" "}
											<button
												type="button"
												className="font-medium text-accent-text underline-offset-4 hover:underline"
												onClick={() => setOwnUsername(true)}
											>
												Choose your own
											</button>
										</Trans>
									</FormDescription>
								)}
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						)}
					</form.Field>

					{ownUsername && (
						<form.Field name="username">
							{(field) => (
								<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
									<FormLabel>
										<Trans comment="Label for username input on registration form">Username</Trans>
									</FormLabel>
									<FormControl
										render={
											<Input
												minLength={3}
												maxLength={64}
												autoComplete="section-register username"
												autoFocus
												dir="ltr"
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
											/>
										}
									/>
									<FormDescription>
										<Trans comment="Hint under the optional username field on registration form">
											Leave it empty to make one from your email. You can change it in Settings.
										</Trans>
									</FormDescription>
									<FormMessage errors={field.state.meta.errors} />
								</FormItem>
							)}
						</form.Field>
					)}

					<form.Field name="password">
						{(field) => (
							<FormItem hasError={field.state.meta.isTouched && field.state.meta.errors.length > 0}>
								<FormLabel>
									<Trans comment="Label for password input on registration form">Password</Trans>
								</FormLabel>
								<FormControl
									render={
										<PasswordInput
											minLength={8}
											maxLength={64}
											autoComplete="section-register new-password"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>
								<FormDescription>
									<Trans comment="Password rule shown under the password field on registration form">
										At least 8 characters.
									</Trans>
								</FormDescription>
								<FormMessage errors={field.state.meta.errors} />
							</FormItem>
						)}
					</form.Field>

					<form.Field name="friendCode">
						{(field) => (
							<FormItem>
								<FormLabel>Friend's code (optional)</FormLabel>
								<FormControl
									render={
										<Input
											maxLength={32}
											autoComplete="off"
											className="uppercase"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
									}
								/>
								<FormDescription>
									Got a code from a friend? You both get extra free AI messages and document reads.
								</FormDescription>
							</FormItem>
						)}
					</form.Field>

					<p className="text-[13px] leading-[18px] text-ink-3">
						By creating an account you agree to the{" "}
						<a href="/privacy" target="_blank" rel="noreferrer" className="underline">
							beta privacy notice
						</a>
						: your résumé stays private to you, and AI features send only what you choose to Google's AI.
					</p>

					<Button type="submit" size="lg" className="mt-1 w-full leading-5" disabled={isSubmitting || betaFull}>
						<Trans comment="Primary action button label on registration form">Create account</Trans>
					</Button>
				</form>
			)}

			<SocialAuth signUp rule={!disableEmailAuth} friendCode={friendCode} />

			<AuthFoot>
				<Trans>
					Already have an account?{" "}
					<Link to="/auth/login" search={{ callbackURL, reauthenticate }}>
						Sign in
					</Link>
				</Trans>
			</AuthFoot>
		</>
	);
}
