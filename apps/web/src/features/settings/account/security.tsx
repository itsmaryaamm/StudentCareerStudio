import type { AuthProvider } from "@reactive-resume/auth/types";
import type { IconName } from "@reactive-resume/ui/components/icon";
import { i18n } from "@lingui/core";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Icon } from "@reactive-resume/ui/components/icon";
import { SettingsRow, SettingsSection, TextAction } from "../section";
import { getProviderName, useAuthAccounts, useAuthProviderActions, useEnabledProviders } from "./auth-hooks";
import { BackupCodesRow } from "./backup-codes";
import { SessionsRow } from "./sessions";
import { IconTile } from "@/components/calm/list-row";
import { useDialogStore } from "@/dialogs/store";
import { authClient } from "@/libs/auth/client";

const SOCIAL: AuthProvider[] = ["apple", "google", "github", "linkedin", "custom"];

const PROVIDER_ICON: Partial<Record<AuthProvider, IconName>> = {
	google: "google-logo",
	github: "github-logo",
	linkedin: "linkedin-logo",
};

const monthYear = (date: Date) => i18n.date(date, { month: "long", year: "numeric" });

export function SecuritySection() {
	const openDialog = useDialogStore((state) => state.openDialog);
	const { hasAccount, getAccountByProviderId } = useAuthAccounts();
	const { enabledProviders } = useEnabledProviders();
	const { link, unlink } = useAuthProviderActions();
	const { data: session } = authClient.useSession();

	const password = getAccountByProviderId("credential");
	const twoFactor = session?.user.twoFactorEnabled ?? false;
	const social = SOCIAL.filter((provider) => provider in enabledProviders);

	return (
		<SettingsSection id="security" title={<Trans>Sign-in and security</Trans>}>
			<SettingsRow
				id="password"
				title={<Trans>Password</Trans>}
				description={
					password ? (
						<Trans>Last changed in {monthYear(new Date(password.updatedAt))}</Trans>
					) : (
						<Trans>You sign in without one</Trans>
					)
				}
			>
				{password ? (
					<TextAction aria-label={t`Change password`} onClick={() => openDialog("auth.change-password", undefined)}>
						<Trans>Change</Trans>
					</TextAction>
				) : "credential" in enabledProviders ? (
					<TextAction onClick={() => openDialog("auth.set-password", undefined)}>
						<Trans>Set a password</Trans>
					</TextAction>
				) : null}
			</SettingsRow>

			<SettingsRow
				id="two-step"
				title={<Trans>Two-step verification</Trans>}
				description={
					!password ? (
						<Trans>Set a password to turn on two-step verification.</Trans>
					) : twoFactor ? (
						<Trans>On · a code from your authenticator app at sign-in</Trans>
					) : (
						<Trans>Off</Trans>
					)
				}
			>
				{/* Turning it on walks through the QR code and backup codes; turning it off asks for the password. */}
				{password &&
					(twoFactor ? (
						<TextAction
							aria-label={t`Turn off two-step verification`}
							onClick={() => openDialog("auth.two-factor.disable", undefined)}
						>
							<Trans>Turn off</Trans>
						</TextAction>
					) : (
						<TextAction
							aria-label={t`Set up two-step verification`}
							onClick={() => openDialog("auth.two-factor.enable", undefined)}
						>
							<Trans>Set up</Trans>
						</TextAction>
					))}
			</SettingsRow>
			{password && twoFactor && <BackupCodesRow />}

			{social.map((provider, index) => {
				const account = getAccountByProviderId(provider);
				const name =
					provider === "custom" ? (enabledProviders.custom ?? getProviderName(provider)) : getProviderName(provider);
				return (
					<SettingsRow
						key={provider}
						id={index === 0 ? "linked-accounts" : undefined}
						leading={
							<IconTile className="bg-raised shadow-[inset_0_0_0_1px_var(--line)]">
								<Icon name={PROVIDER_ICON[provider] ?? "sign-in"} size={20} />
							</IconTile>
						}
						title={name}
						description={hasAccount(provider) ? <Trans>Connected</Trans> : <Trans>Not connected</Trans>}
					>
						{account ? (
							<TextAction onClick={() => void unlink(provider, account.id)}>
								<Trans>Disconnect</Trans>
							</TextAction>
						) : (
							<TextAction onClick={() => void link(provider)}>
								<Trans>Connect</Trans>
							</TextAction>
						)}
					</SettingsRow>
				);
			})}

			<SessionsRow />
		</SettingsSection>
	);
}
