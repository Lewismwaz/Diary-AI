"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";
import {
  useRouter,
} from "next/navigation";

import {
  PasswordVisibilityIcon,
} from "@/components/ui/password-visibility-icon";

import Button from "@/components/ui/button";
import StatusMessage from "@/components/ui/status-message";

type RegisterResponse = {
  error?: string;
};

export default function RegisterForm() {
  const router =
    useRouter();

  const [
    firstName,
    setFirstName,
  ] = useState("");

  const [
    lastName,
    setLastName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const normalizedEmail =
    email.trim();

  const hasValidEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail
    );

  const hasValidPassword =
    password.length >= 8 &&
    password.length <= 128 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password);

  const passwordsMatch =
    password ===
      confirmPassword;

  const isFormValid =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 2 &&
    hasValidEmail &&
    hasValidPassword &&
    confirmPassword.length >= 8 &&
    passwordsMatch;

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!isFormValid) {
      setError(
        "Please complete the form correctly before creating your account."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/register",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                firstName,
                lastName,
                email,
                password,
                confirmPassword,
              }),
          }
        );

      const responseText =
        await response.text();

      let result:
        RegisterResponse = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            ) as RegisterResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to create your account."
        );
      }

      router.push(
        "/login?registered=true"
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-5"
    >
      {error && (
        <StatusMessage
          type="error"
          message={error}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            First name
          </label>

          <input
            id="firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={60}
            value={
              firstName
            }
            onChange={(
              event
            ) =>
              setFirstName(
                event.target
                  .value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="lastName"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Last name
          </label>

          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            required
            minLength={2}
            maxLength={60}
            value={
              lastName
            }
            onChange={(
              event
            ) =>
              setLastName(
                event.target
                  .value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

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
          autoComplete="email"
          required
          maxLength={320}
          value={email}
          onChange={(
            event
          ) =>
            setEmail(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
            autoComplete="new-password"
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

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Use at least 8
          characters with
          uppercase, lowercase
          and a number.
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Confirm password
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
            minLength={8}
            maxLength={128}
            value={
              confirmPassword
            }
            onChange={(event) =>
              setConfirmPassword(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(
                (current) =>
                  !current
              )
            }
            aria-label={
              showConfirmPassword
                ? "Hide confirm password"
                : "Show confirm password"
            }
            aria-pressed={
              showConfirmPassword
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
              visible={showConfirmPassword}
            />
          </button>
        </div>

        {confirmPassword.length >
          0 &&
          !passwordsMatch && (
            <p
              className="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
              role="status"
            >
              Passwords do not match.
            </p>
          )}
      </div>

      <Button
        type="submit"
        disabled={
          !isFormValid ||
          isSubmitting
        }
        className="
          w-full
          enabled:cursor-pointer
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >
        {isSubmitting
          ? "Creating account..."
          : "Create account"}
      </Button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an
        account?{" "}
        <Link
          href="/login"
          className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}