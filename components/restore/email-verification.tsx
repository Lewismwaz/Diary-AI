"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

type OtpStatus = {
  maskedEmail: string;
  verified: boolean;
  sentCount: number;
  maxSends: number;
  cooldownSeconds: number;
  codePending: boolean;
  error?: string;
};

type OtpResult = {
  sent?: boolean;
  verified?: boolean;
  error?: string;
  message?: string;
};

export default function EmailVerification() {
  const router = useRouter();

  const [status, setStatus] = useState<OtpStatus | null>(
    null
  );
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    const response = await fetch(
      "/api/restore/email-otp",
      { cache: "no-store" }
    );

    const result = (await response.json()) as OtpStatus;

    if (!response.ok) {
      throw new Error(
        result.error ?? "Unable to check recovery status."
      );
    }

    setStatus(result);
    setVerified(result.verified);
    setCooldown(result.cooldownSeconds);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const response = await fetch(
          "/api/restore/email-otp",
          { cache: "no-store" }
        );

        const result =
          (await response.json()) as OtpStatus;

        if (cancelled) return;

        if (!response.ok) {
          throw new Error(
            result.error ?? "Unable to load recovery status."
          );
        }

        setStatus(result);
        setVerified(result.verified);
        setCooldown(result.cooldownSeconds);
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load verification."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  // No timer is required: calculate remaining cooldown
  // when the user requests an updated status.
  async function sendCode() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/restore/email-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "send" }),
        }
      );

      const result =
        (await response.json()) as OtpResult;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Unable to send code."
        );
      }

      setMessage("A verification code has been sent.");
      setCode("");
      await refreshStatus();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to send code."
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        "/api/restore/email-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "verify",
            code,
          }),
        }
      );

      const result =
        (await response.json()) as OtpResult;

      if (!response.ok) {
        throw new Error(
          result.error ?? "Verification failed."
        );
      }

      if (result.verified !== true) {
        throw new Error("Unexpected server response.");
      }

      setCode("");
      setVerified(true);
      setMessage("Recovery email verified successfully.");

      // Show the dedicated five-second success stage.
      router.replace("/restore?step=email-success");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Verification failed."
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p role="status" className="text-sm">
        Loading email verification...
      </p>
    );
  }

  if (verified) {
    return (
      <section className="space-y-4">
        <div
          role="status"
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <h2 className="text-lg font-semibold">
            Recovery email verified
          </h2>
          <p className="mt-2 text-sm">
            {message ||
              "Your email verification is complete."}
          </p>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The next step is to preview your recovered
          account and verify the account password saved
          when this backup was created.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">
          Verify recovery email
        </h2>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We will send a six-digit code to the email
          address stored in your encrypted backup.
        </p>

        {status && (
          <p className="mt-3 font-medium">
            {status.maskedEmail}
          </p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}

      {message && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        >
          {message}
        </p>
      )}

      <button
        type="button"
        disabled={
          busy ||
          !status ||
          status.sentCount >= status.maxSends ||
          cooldown > 0
        }
        onClick={() => void sendCode()}
        className="w-full cursor-pointer rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy
          ? "Please wait..."
          : status?.sentCount
            ? "Resend Verification Code"
            : "Send Verification Code"}
      </button>

      {status && (
        <p className="text-xs text-zinc-500">
          Codes sent: {status.sentCount} of{" "}
          {status.maxSends}.
          {cooldown > 0 &&
            ` Wait approximately ${cooldown} seconds before resending.`}
        </p>
      )}

      <form onSubmit={verifyCode} className="space-y-3">
        <label
          htmlFor="restore-otp"
          className="block text-sm font-medium"
        >
          Six-digit verification code
        </label>

        <input
          id="restore-otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value
                .replace(/\D/g, "")
                .slice(0, 6)
            )
          }
          placeholder="000000"
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-xl tracking-[0.35em] text-zinc-950 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
        />

        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="w-full cursor-pointer rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Verifying..." : "Verify Email & Continue"}
        </button>
      </form>

      <button
        type="button"
        onClick={async () => {
          setError("");
          try {
            await refreshStatus();
          } catch (caught) {
            setError(
              caught instanceof Error
                ? caught.message
                : "Unable to refresh status."
            );
          }
        }}
        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        Refresh resend availability
      </button>

      <p className="text-xs text-zinc-500">
        Verification codes expire after 10 minutes.
        Your existing diary remains unchanged.
      </p>
    </section>
  );
}
