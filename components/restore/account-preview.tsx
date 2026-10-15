"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  finishPortableRestore,
  type PortableRestoreState,
} from "@/app/actions/portable-restore";

type Preview = {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  exportedAt: string;
  entryCount: number;
  analysisCount: number;
};

type PreviewResult = {
  success?: boolean;
  preview?: Preview;
  error?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-KE", {
        dateStyle: "long",
        timeZone: "Africa/Nairobi",
      }).format(date);
}

function RestoreButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? "Restoring your account and journal..." : "Verify Password & Restore Account"}
    </button>
  );
}

export default function AccountPreview() {
  const [passphrase, setPassphrase] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initial: PortableRestoreState = { error: "" };
  const [restoreState, restoreAction] = useActionState(
    finishPortableRestore,
    initial
  );

  async function previewAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/restore/account-preview", {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview", passphrase }),
      });
      const result = (await response.json()) as PreviewResult;
      if (!response.ok || !result.success || !result.preview) {
        throw new Error(result.error ?? "Unable to preview this account.");
      }
      setPreview(result.preview);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "An unexpected error occurred."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Recover your account</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Review your recovered account, then enter its backup-era password to
          restore your account and journal automatically.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      )}

      {!preview ? (
        <form onSubmit={(event) => void previewAccount(event)} className="space-y-4">
          <label htmlFor="restore-passphrase" className="block text-sm font-medium">
            Backup encryption passphrase
          </label>
          <div className="flex gap-2">
            <input
              id="restore-passphrase"
              type={showPassphrase ? "text" : "password"}
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              minLength={12}
              maxLength={1024}
              required
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
            />
            <button type="button" onClick={() => setShowPassphrase((v) => !v)} className="rounded-lg border px-4 dark:border-zinc-700">
              {showPassphrase ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" disabled={busy || passphrase.length < 12} className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {busy ? "Reading backup..." : "Preview Account"}
          </button>
        </form>
      ) : (
        <>
          <div className="space-y-4 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <h3 className="text-lg font-semibold">Recovered account details</h3>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-zinc-500">First name</dt><dd className="font-medium">{preview.firstName}</dd></div>
              <div><dt className="text-zinc-500">Last name</dt><dd className="font-medium">{preview.lastName}</dd></div>
              <div className="sm:col-span-2"><dt className="text-zinc-500">Email</dt><dd className="break-all font-medium">{preview.email}</dd></div>
              <div><dt className="text-zinc-500">Date joined</dt><dd className="font-medium">{formatDate(preview.createdAt)}</dd></div>
              <div><dt className="text-zinc-500">Backup created</dt><dd className="font-medium">{formatDate(preview.exportedAt)}</dd></div>
              <div><dt className="text-zinc-500">Diary entries</dt><dd className="font-medium">{preview.entryCount}</dd></div>
              <div><dt className="text-zinc-500">AI analyses</dt><dd className="font-medium">{preview.analysisCount}</dd></div>
            </dl>
          </div>

          {restoreState.error && (
            <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
              {restoreState.error}
            </p>
          )}

          <form action={restoreAction} className="space-y-4">
            <input type="hidden" name="passphrase" value={passphrase} />
            <div>
              <h3 className="font-semibold">Verify account password and restore</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Enter the Diary AI password that was valid when this backup was created.
                A correct password will restore the account and journal immediately.
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                name="accountPassword"
                required
                maxLength={1024}
                autoComplete="off"
                placeholder="Backup-era account password"
                aria-label="Backup-era account password"
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="rounded-lg border px-4 dark:border-zinc-700">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <RestoreButton />
          </form>
        </>
      )}
    </section>
  );
}
