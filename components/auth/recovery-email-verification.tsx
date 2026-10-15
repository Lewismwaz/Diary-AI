"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import StatusMessage from "@/components/ui/status-message";

type EmailStatus = {
  maskedEmail: string;
  verified: boolean;
  sentCount: number;
  maxSends: number;
  cooldownSeconds: number;
};

async function readJson(response: Response) {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function RecoveryEmailVerification() {
  const router = useRouter();

  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadStatus = useCallback(async () => {
    const response = await fetch(
      "/api/auth/recovery/email-otp/status",
      { cache: "no-store" }
    );

    const body = await readJson(response);

    if (!response.ok || !body?.data) {
      throw new Error(
        body?.error ?? "Unable to load email verification."
      );
    }

    const next = body.data as EmailStatus;

    setStatus(next);
    setCooldown(next.cooldownSeconds);

    if (next.verified) {
      router.push("/recover/reset-password");
    }
  }, [router]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await loadStatus();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Unable to load."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [loadStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function sendCode() {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/auth/recovery/email-otp/send",
        { method: "POST" }
      );

      const body = await readJson(response);

      if (!response.ok || !body?.data?.sent) {
        throw new Error(
          body?.error ?? "Unable to send verification code."
        );
      }

      setSuccess("A verification code has been sent.");
      await loadStatus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send code."
      );

      try {
        await loadStatus();
      } catch {
        // Preserve the original error.
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/auth/recovery/email-otp/verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        }
      );

      const body = await readJson(response);

      if (!response.ok || !body?.data?.verified) {
        throw new Error(
          body?.error ?? "Unable to verify the code."
        );
      }

      router.push("/recover/reset-password");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to verify the code."
      );
    } finally {
      setBusy(false);
    }
  }

  const remainingSends = status
    ? Math.max(0, status.maxSends - status.sentCount)
    : 0;

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Verify your email
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Confirm access to your registered email address
          before resetting your Diary AI password.
        </p>
      </div>

      {error && (
        <div className="mt-5">
          <StatusMessage type="error" message={error} />
        </div>
      )}

      {success && (
        <div className="mt-5">
          <StatusMessage type="success" message={success} />
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          Loading verification...
        </p>
      ) : status ? (
        <>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Registered email
            </p>

            <p className="mt-1 font-semibold text-slate-900 dark:text-white">
              {status.maskedEmail}
            </p>
          </div>

          <form onSubmit={verifyCode} className="mt-6">
            <label
              htmlFor="recovery-code"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              6-digit verification code
            </label>

            <input
              id="recovery-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(
                  event.target.value.replace(/\D/g, "").slice(0, 6)
                )
              }
              placeholder="000000"
              disabled={busy}
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-center text-xl font-semibold tracking-[0.3em] text-slate-950 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />

            <button
              type="submit"
              disabled={busy || code.length !== 6 || status.sentCount === 0}
              className="mt-5 min-h-11 w-full rounded-xl bg-sky-600 px-4 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Please wait..." : "Verify email"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={sendCode}
              disabled={
                busy ||
                cooldown > 0 ||
                remainingSends <= 0
              }
              className="text-sm font-semibold text-sky-600 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.sentCount === 0
                ? "Send verification code"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend verification code"}
            </button>

            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {remainingSends} of {status.maxSends} sends remaining
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}