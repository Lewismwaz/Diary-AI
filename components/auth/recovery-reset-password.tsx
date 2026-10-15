
"use client";

import {
  useMemo,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  PasswordVisibilityIcon,
} from "@/components/ui/password-visibility-icon";

import {
  resetPasswordSchema,
} from "@/domain/auth/reset-password.schema";

import StatusMessage from "@/components/ui/status-message";

type Feedback = {
  type: "error" | "success" | "info";
  message: string;
};

type PasswordRule = {
  label: string;
  passed: boolean;
};

export function RecoveryResetPassword() {
  const router = useRouter();

  const [newPassword, setNewPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isComplete, setIsComplete] =
    useState(false);

  const [feedback, setFeedback] =
    useState<Feedback | null>(null);

  const passwordRules =
    useMemo<PasswordRule[]>(
      () => [
        {
          label: "8–128 characters",
          passed:
            newPassword.length >= 8 &&
            newPassword.length <= 128,
        },
        {
          label: "One uppercase letter",
          passed: /[A-Z]/.test(newPassword),
        },
        {
          label: "One lowercase letter",
          passed: /[a-z]/.test(newPassword),
        },
        {
          label: "One number",
          passed: /[0-9]/.test(newPassword),
        },
      ],
      [newPassword]
    );

  const passedRuleCount =
    passwordRules.filter(
      (rule) => rule.passed
    ).length;

  const passwordsMatch =
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  const canSubmit =
    passedRuleCount === passwordRules.length &&
    passwordsMatch &&
    !isSubmitting &&
    !isComplete;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting || isComplete) {
      return;
    }

    setFeedback(null);

    const validation =
      resetPasswordSchema.safeParse({
        newPassword,
        confirmPassword,
      });

    if (!validation.success) {
      setFeedback({
        type: "error",
        message:
          validation.error.issues[0]?.message ??
          "Please check your password.",
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        "/api/auth/recovery/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify(validation.data),
        }
      );

      /*
       * Read text first to avoid crashing
       * when a server error returns an
       * empty or non-JSON response.
       */
      const responseText =
        await response.text();

      let result: {
        error?: string;
        data?: {
          success?: boolean;
          message?: string;
        };
      } = {};

      if (responseText) {
        try {
          result = JSON.parse(responseText);
        } catch {
          // Use the fallback error below.
        }
      }

      if (
        !response.ok ||
        result.data?.success !== true
      ) {
        setFeedback({
          type: "error",
          message:
            result.error ??
            "Unable to reset your password. Please try again.",
        });

        return;
      }

      setIsComplete(true);
      setNewPassword("");
      setConfirmPassword("");

      setFeedback({
        type: "success",
        message:
          "Your password has been reset successfully.",
      });
    } catch {
      setFeedback({
        type: "error",
        message:
          "A network error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isComplete) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            Password updated
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Your recovery session has been
            completed. Sign in using your
            new password.
          </p>
        </div>

        {feedback && (
          <StatusMessage
            type={feedback.type}
            message={feedback.message}
          />
        )}

        <button
          type="button"
          onClick={() => {
            router.push("/login");
            router.refresh();
          }}
          className="flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
        >
          Continue to sign in
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      <div className="space-y-2">
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium"
        >
          New password
        </label>

        <div className="relative">
          <input
            id="newPassword"
            name="newPassword"
            type={
              showNewPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            value={newPassword}
            onChange={(event) => {
              setNewPassword(
                event.target.value
              );
              setFeedback(null);
            }}
            disabled={isSubmitting}
            placeholder="Enter a secure password"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowNewPassword(
                (value) => !value
              )
            }
            disabled={isSubmitting}
            aria-label={
              showNewPassword
                ? "Hide new password"
                : "Show new password"
            }
            aria-pressed={showNewPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400"
          >
            <PasswordVisibilityIcon
              visible={showNewPassword}
            />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Password requirements
          </p>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {passedRuleCount}/{passwordRules.length}
          </span>
        </div>

        <div
          className="mb-3 grid grid-cols-4 gap-1.5"
          aria-hidden="true"
        >
          {passwordRules.map(
            (rule, index) => (
              <div
                key={rule.label}
                className={`h-1.5 rounded-full ${
                  index < passedRuleCount
                    ? "bg-sky-600"
                    : "bg-slate-200 dark:bg-slate-800"
                }`}
              />
            )
          )}
        </div>

        <ul className="space-y-2">
          {passwordRules.map((rule) => (
            <li
              key={rule.label}
              className={`flex items-center gap-2 text-xs ${
                rule.passed
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <span aria-hidden="true">
                {rule.passed ? "✓" : "○"}
              </span>

              {rule.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium"
        >
          Confirm new password
        </label>

        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={
              showConfirmPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            maxLength={128}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(
                event.target.value
              );
              setFeedback(null);
            }}
            disabled={isSubmitting}
            placeholder="Re-enter your new password"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                (value) => !value
              )
            }
            disabled={isSubmitting}
            aria-label={
              showConfirmPassword
                ? "Hide confirmation password"
                : "Show confirmation password"
            }
            aria-pressed={
              showConfirmPassword
            }
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 hover:text-sky-600 dark:text-slate-400"
          >
            <PasswordVisibilityIcon
              visible={showConfirmPassword}
            />
          </button>
        </div>

        {confirmPassword.length > 0 && (
          <p
            className={`text-xs ${
              passwordsMatch
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {passwordsMatch
              ? "Passwords match."
              : "Passwords do not match."}
          </p>
        )}
      </div>

      {feedback && (
        <StatusMessage
          type={feedback.type}
          message={feedback.message}
        />
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Resetting password...
          </>
        ) : (
          "Reset password"
        )}
      </button>

      <p className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400">
        Your recovery authorization is
        temporary and can only be used once.
      </p>

      <div className="text-center">
        <Link
          href="/recover"
          className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400"
        >
          Start recovery again
        </Link>
      </div>
    </form>
  );
}
