"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import StatusMessage from "@/components/ui/status-message";

export default function BackupPassphraseVerification() {
  const router = useRouter();

  const [passphrase, setPassphrase] =
    useState("");

  const [error, setError] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!passphrase) {
      setError(
        "Enter your backup passphrase."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/auth/recovery/verify-backup",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              passphrase,
            }),
          }
        );

      const responseText =
        await response.text();

      let body:
        | {
            error?: string;
            data?: {
              verified?: boolean;
            };
          }
        | null = null;

      if (responseText) {
        try {
          body =
            JSON.parse(responseText);
        } catch {
          body = null;
        }
      }

      if (
        !response.ok ||
        !body?.data?.verified
      ) {
        throw new Error(
          body?.error ??
            "The backup could not be verified. Check your backup passphrase and try again."
        );
      }

      /*
       * Full navigation ensures the following
       * Server Component sees the updated
       * server-side recovery state.
       */
      router.push("/recover/verify-email");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The backup could not be verified."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
    >
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Verify your backup
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Enter the passphrase you used to
          encrypt your Diary AI backup.
        </p>
      </div>

      {error && (
        <div className="mt-5">
          <StatusMessage
            type="error"
            message={error}
          />
        </div>
      )}

      <div className="mt-6">
        <label
          htmlFor="backup-passphrase"
          className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
        >
          Backup passphrase
        </label>

        <input
          id="backup-passphrase"
          name="backup-passphrase"
          type="password"
          autoComplete="off"
          value={passphrase}
          disabled={isSubmitting}
          onChange={(event) =>
            setPassphrase(
              event.target.value
            )
          }
          className="
            mt-2 min-h-11 w-full rounded-xl
            border border-slate-300
            bg-white px-3 py-2.5
            text-sm text-slate-950
            outline-none transition

            focus:border-sky-500
            focus:ring-2
            focus:ring-sky-500/20

            disabled:cursor-not-allowed
            disabled:opacity-60

            dark:border-slate-700
            dark:bg-slate-950
            dark:text-white
          "
        />
      </div>

      <button
        type="submit"
        disabled={
          isSubmitting ||
          !passphrase
        }
        className="
          mt-6 inline-flex min-h-11 w-full
          items-center justify-center
          rounded-xl bg-sky-600
          px-4 py-2.5
          text-sm font-semibold text-white
          transition

          hover:bg-sky-700

          disabled:cursor-not-allowed
          disabled:opacity-60

          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-sky-500
          focus-visible:ring-offset-2

          dark:focus-visible:ring-offset-slate-900
        "
      >
        {isSubmitting
          ? "Verifying..."
          : "Verify backup"}
      </button>

      <p className="mt-4 text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
        Diary AI does not store your backup
        passphrase.
      </p>
    </form>
  );
}