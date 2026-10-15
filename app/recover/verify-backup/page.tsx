import {
  cookies,
} from "next/headers";

import {
  redirect,
} from "next/navigation";

import { auth } from "@/auth";

import { AppBrand } from "@/components/branding/app-brand";
import BackupPassphraseVerification from "@/components/auth/backup-passphrase-verification";

import {
  ACCOUNT_RECOVERY_COOKIE,
  getAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";

export default async function VerifyBackupPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const cookieStore =
    await cookies();

  const recoveryToken =
    cookieStore.get(
      ACCOUNT_RECOVERY_COOKIE
    )?.value;

  if (!recoveryToken) {
    redirect(
      "/recover?status=recovery_expired"
    );
  }

  const recoverySession =
    await getAccountRecoverySession(
      recoveryToken
    );

  if (!recoverySession) {
    redirect(
      "/recover?status=recovery_expired"
    );
  }

  if (recoverySession.backupVerifiedAt) {
    /*
     * This route will be created in the
     * following OTP phase.
     */
    redirect("/recover/verify-email");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-center">
          <AppBrand
            size="lg"
            href="#"
            priority
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <BackupPassphraseVerification />
        </div>
      </div>
    </main>
  );
}