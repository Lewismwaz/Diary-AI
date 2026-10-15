
import Link from "next/link";
import { cookies } from "next/headers";

import BackupSelection from "@/components/restore/backup-selection";
import EmailVerification from "@/components/restore/email-verification";
import BackupVerifiedTransition from "@/components/restore/backup-verified-transition";
import GoogleContinueButton from "@/components/restore/google-continue-button";
import EmailVerifiedTransition from "@/components/restore/email-verified-transition";
import AccountPreview from "@/components/restore/account-preview";

import {
  getPortableRestoreSession,
  PORTABLE_RESTORE_COOKIE,
} from "@/lib/auth/portable-restore-session";

export const dynamic = "force-dynamic";

type RestorePageProps = {
  searchParams: Promise<{
    error?: string;
    step?: string;
  }>;
};

export default async function RestorePage({
  searchParams,
}: RestorePageProps) {
  const { error, step } = await searchParams;

  const cookieStore = await cookies();

  const restoreToken = cookieStore.get(
    PORTABLE_RESTORE_COOKIE
  )?.value;

  const session = restoreToken
    ? await getPortableRestoreSession(restoreToken)
    : null;

  const googleVerified = Boolean(
    session?.googleVerifiedAt &&
      session?.googleAccountId &&
      session?.encryptedGoogleAccessToken
  );

  const backupVerified = Boolean(
    googleVerified &&
      session?.backupVerifiedAt &&
      session?.googleFileId &&
      session?.backupDigest
  );

  const emailVerified = Boolean(
    backupVerified &&
      session?.emailVerifiedAt
  );

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Restore Diary AI
          </h1>

          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Recover your account and journal from an
            encrypted Google Drive backup.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            >
              Google verification was not completed.
              Please try again.
            </div>
          )}

          {!googleVerified ? (
            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">
                  Connect Google Drive
                </h2>

                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Verify the Google account containing
                  your encrypted Diary AI backup.
                </p>
              </div>

              <GoogleContinueButton />

              <p className="text-xs text-zinc-500">
                Google verification does not sign you
                into Diary AI or restore any data.
              </p>
            </section>
          ) : emailVerified && step === "email-success" ? (
            <EmailVerifiedTransition />
          ) : emailVerified ? (
            <AccountPreview />
          ) : backupVerified && step === "backup-success" ? (
            <BackupVerifiedTransition />
          ) : backupVerified ? (
            <EmailVerification />
          ) : (
            <BackupSelection />
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
