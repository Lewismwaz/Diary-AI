
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppBrand } from "@/components/branding/app-brand";
import { RecoveryResetPassword } from "@/components/auth/recovery-reset-password";

import {
  ACCOUNT_RECOVERY_COOKIE,
  getAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function ResetPasswordPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();

  const recoveryToken =
    cookieStore.get(ACCOUNT_RECOVERY_COOKIE)?.value;

  if (!recoveryToken) {
    redirect("/recover");
  }

  const recovery =
    await getAccountRecoverySession(recoveryToken);

  if (!recovery) {
    redirect("/recover");
  }

  if (!recovery.googleVerifiedAt) {
    redirect("/recover");
  }

  if (!recovery.backupVerifiedAt) {
    redirect("/recover/verify-backup");
  }

  if (!recovery.emailVerifiedAt) {
    redirect("/recover/verify-email");
  }

  const connection =
    await prisma.googleBackupConnection.findUnique({
      where: {
        userId: recovery.userId,
      },
      select: {
        userId: true,
      },
    });

  if (!connection) {
    redirect("/recover");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-0 flex justify-center">
          <AppBrand
              size="lg"
              href="#"
              priority
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Reset your password
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Your identity has been verified.
              Create a secure password to regain
              access to your Diary AI account.
            </p>
          </div>

          <RecoveryResetPassword />
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
          Your existing diary entries and
          encrypted Google Drive backups
          will not be changed.
        </p>
      </div>
    </main>
  );
}
