"use client";

import {
  useActionState,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  PasswordVisibilityIcon,
} from "@/components/ui/password-visibility-icon";

import {
  login,
  type LoginState,
} from "@/app/actions/auth";

import Button from "@/components/ui/button";
import StatusMessage from "@/components/ui/status-message";

const initialState: LoginState = {};

export default function LoginForm() {
  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const searchParams =
    useSearchParams();

  const registered =
    searchParams.get("registered") ===
    "true";

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    login,
    initialState
  );

  const canSubmit =
    email.trim() !== "" &&
    password.length >= 8 &&
    !isPending;

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      {registered && (
        <StatusMessage
          type="success"
          message="Account created successfully. You can now sign in."
        />
      )}

      {state.error && (
        <StatusMessage
          type="error"
          message={state.error}
        />
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email
        </label>

        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={320}
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Password
        </label>

        <div className="relative">
          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="current-password"
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (current) =>
                  !current
              )
            }
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
            aria-pressed={
              showPassword
            }
            className="
              absolute right-1 top-1/2
              flex h-10 w-10
              -translate-y-1/2
              items-center justify-center
              rounded-lg cursor-pointer
              text-slate-500
              transition
              hover:bg-slate-100
              hover:text-slate-900
              dark:text-slate-400
              dark:hover:bg-slate-800
              dark:hover:text-slate-200
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-sky-500
            "
          >
            <PasswordVisibilityIcon
              visible={showPassword}
            />
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit}
        className="
          w-full
          enabled:cursor-pointer
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        {isPending
          ? "Signing in..."
            : "Sign in"}
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/restore"
          className="text-sm font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          Restore Backup
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/recover"
            className="text-sm font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
          >
            Forgot password?
          </Link>
        </div>

      </div>


      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          Create account
        </Link>
      </p>
    </form>
  );
}