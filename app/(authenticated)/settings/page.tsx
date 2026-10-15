import type {
  Metadata,
} from "next";

import {
  redirect,
} from "next/navigation";

import AccountSecurity from "@/components/settings/account-security";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  AccountNotFoundError,
  getAccountProfile,
} from "@/services/account.service";

import {
  ThemeSelector,
} from "@/components/theme/theme-selector";

import PrivacyAISettings from "@/components/settings/privacy-ai-settings";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

import {
  BackupRestoreSettings,
} from "@/components/settings/backup-restore-settings";

export const metadata: Metadata = {
  title: "Settings",
};

import {
  getGoogleBackupConnectionStatus,
} from "@/services/google-backup-connection.service";

export default async function SettingsPage() {
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    redirect("/login");
  }

  let account;

  try {
    account =
      await getAccountProfile(
        userId
      );
  } catch (error) {
    if (
      error instanceof
      AccountNotFoundError
    ) {
      redirect("/login");
    }

    throw error;
  }

  const privacySettings =
    await getPrivacySettings(
      userId
    );

  const googleBackupConnection =
    await getGoogleBackupConnectionStatus(
      userId
    );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pb-10 lg:px-8">
      <div className="mb-5">
        <p className="mt-0 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Manage your account,
          preferences, privacy and
          backups.
        </p>
      </div>

      <div className="space-y-10">
        <AccountSecurity
          firstName={
            account.firstName
          }
          lastName={
            account.lastName
          }
          email={
            account.email
          }
          createdAt={
            account.createdAt
          }
        />

        <section
          id="appearance"
          className="space-y-4"
        >
          <div>
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Appearance
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Control how Diary AI
              looks on this device.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Theme
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Choose your preferred
                  interface appearance.
                </p>
              </div>

              <div className="shrink-0">
                <ThemeSelector />
              </div>
            </div>
          </div>
        </section>

        <PrivacyAISettings
          initialAllowVoiceTranscription={
            privacySettings
              .allowVoiceTranscription
          }
          initialAllowAIProcessing={
            privacySettings
              .allowAIProcessing
          }
          initialAllowAITrendAnalysis={
            privacySettings
              .allowAITrendAnalysis
          }
        />

        <BackupRestoreSettings
          googleConnection={
            googleBackupConnection
          }
        />
      </div>
    </main>
  );
}

