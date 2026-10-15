"use client";

import Link from "next/link";

import StatusMessage from "@/components/ui/status-message";

type RecoveryStartProps = {
  status?: string;
};

export default function RecoveryStart({
  status,
}: RecoveryStartProps) {
  let statusMessage:
    | {
        type: "error" | "info";
        message: string;
      }
    | null = null;

  switch (status) {
    case "not_eligible":
      statusMessage = {
        type: "error",
        message:
          "Google recovery is not available for this account. Google Drive must have been connected to Diary AI before account access was lost.",
      };
      break;

    case "recovery_expired":
      statusMessage = {
        type: "error",
        message:
          "Your account recovery session has expired. Please start again.",
      };
      break;

    case "google_cancelled":
      statusMessage = {
        type: "info",
        message:
          "Google account recovery was cancelled.",
      };
      break;

    case "invalid_state":
      statusMessage = {
        type: "error",
        message:
          "The recovery request expired or could not be verified. Please start again.",
      };
      break;

    case "missing_code":
    case "google_failed":
    case "google_identity_failed":
      statusMessage = {
        type: "error",
        message:
          "Diary AI could not verify your Google account. Please try again.",
      };
      break;
  }

  return (
    <div className="w-full">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Recover your account
        </h1>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-400">
          Recover access using the Google account
          previously connected to Diary AI.
        </p>
      </div>

      {statusMessage && (
        <div className="mt-5">
          <StatusMessage
            type={statusMessage.type}
            message={statusMessage.message}
          />
        </div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          What you&apos;ll need
        </p>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          <li>
            • Access to your previously connected Google
            account
          </li>

          <li>
            • Your Diary AI backup passphrase
          </li>

          <li>
            • Access to your verification email
          </li>
        </ul>
      </div>

      <div className="mt-6">
        <a
          href="/api/auth/recovery/google"
          className="
            inline-flex min-h-11 w-full
            items-center justify-center
            rounded-xl bg-sky-600
            px-4 py-2.5
            text-sm font-semibold text-white
            transition

            hover:bg-sky-700

            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-sky-500
            focus-visible:ring-offset-2

            dark:focus-visible:ring-offset-slate-900
          "
        >
          Continue with Google
        </a>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
        Recovery is available only if Google Drive was
        connected to your Diary AI account before you
        lost access.
      </p>

      <div className="mt-6 border-t border-slate-200 pt-5 text-center dark:border-slate-800">
        <Link
          href="/login"
          className="text-sm font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}