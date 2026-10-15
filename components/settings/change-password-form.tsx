"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  PasswordVisibilityIcon,
} from "@/components/ui/password-visibility-icon";

import Button from "@/components/ui/button";
import StatusMessage from "@/components/ui/status-message";

type ChangePasswordResponse = {
  data?: {
    message?: string;
  };

  error?: string;
};

export default function ChangePasswordForm() {
  const [
    currentPassword,
    setCurrentPassword,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
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
    success,
    setSuccess,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const hasValidNewPassword =
    newPassword.length >= 8 &&
    newPassword.length <= 128 &&
    /[A-Z]/.test(
      newPassword
    ) &&
    /[a-z]/.test(
      newPassword
    ) &&
    /\d/.test(
      newPassword
    );

  const passwordsMatch =
    newPassword ===
    confirmPassword;

  const passwordChanged =
    currentPassword !==
    newPassword;

  const isFormValid =
    currentPassword.length > 0 &&
    currentPassword.length <= 128 &&
    hasValidNewPassword &&
    confirmPassword.length >= 8 &&
    passwordsMatch &&
    passwordChanged;

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!isFormValid) {
      setError(
        "Please complete the password form correctly."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/account/password",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword,
              }),
          }
        );

      const responseText =
        await response.text();

      let result:
        ChangePasswordResponse = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            ) as ChangePasswordResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to change your password."
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setShowCurrentPassword(
        false
      );

      setShowNewPassword(
        false
      );

      setShowConfirmPassword(
        false
      );

    setSuccess(
      "Password changed successfully!"
    );

    /*
     * The server has already incremented
     * sessionVersion, invalidating all existing
     * JWT sessions for this account.
     */
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

  const inputClassName =
    "w-full rounded-xl border border-slate-300 bg-white py-3 pl-4 pr-12 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

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

      {success && (
        <StatusMessage
          type="success"
          message={success}
        />
      )}

      <PasswordField
        id="currentPassword"
        label="Current password"
        autoComplete="current-password"
        value={currentPassword}
        visible={
          showCurrentPassword
        }
        onChange={
          setCurrentPassword
        }
        onToggleVisibility={() =>
          setShowCurrentPassword(
            (current) =>
              !current
          )
        }
        inputClassName={
          inputClassName
        }
      />

      <div>
        <PasswordField
          id="newPassword"
          label="New password"
          autoComplete="new-password"
          value={newPassword}
          visible={
            showNewPassword
          }
          onChange={
            setNewPassword
          }
          onToggleVisibility={() =>
            setShowNewPassword(
              (current) =>
                !current
            )
          }
          inputClassName={
            inputClassName
          }
        />

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Use at least 8 characters
          with uppercase, lowercase
          and a number.
        </p>

        {newPassword.length >
          0 &&
          !passwordChanged && (
            <p
              className="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
              role="status"
            >
              Your new password
              must be different
              from your current
              password.
            </p>
          )}
      </div>

      <div>
        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          value={
            confirmPassword
          }
          visible={
            showConfirmPassword
          }
          onChange={
            setConfirmPassword
          }
          onToggleVisibility={() =>
            setShowConfirmPassword(
              (current) =>
                !current
            )
          }
          inputClassName={
            inputClassName
          }
        />

        {confirmPassword.length >
          0 &&
          !passwordsMatch && (
            <p
              className="mt-2 text-xs font-medium text-red-600 dark:text-red-400"
              role="status"
            >
              Passwords do not
              match.
            </p>
          )}
      </div>

      <Button
        type="submit"
        disabled={
          !isFormValid ||
          isSubmitting
        }
      >
        {isSubmitting
          ? "Changing password..."
          : "Change password"}
      </Button>
    </form>
  );
}

type PasswordFieldProps = {
  id: string;
  label: string;

  autoComplete:
    | "current-password"
    | "new-password";

  value: string;
  visible: boolean;

  onChange: (
    value: string
  ) => void;

  onToggleVisibility:
    () => void;

  inputClassName: string;
};

function PasswordField({
  id,
  label,
  autoComplete,
  value,
  visible,
  onChange,
  onToggleVisibility,
  inputClassName,
}: PasswordFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          type={
            visible
              ? "text"
              : "password"
          }
          autoComplete={
            autoComplete
          }
          required
          maxLength={128}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value
            )
          }
          className={
            inputClassName
          }
        />

        <button
          type="button"
          onClick={
            onToggleVisibility
          }
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={
            visible
          }
          className="
            absolute right-1 top-1/2
            flex h-10 w-10
            -translate-y-1/2
            cursor-pointer
            items-center justify-center
            rounded-lg
            text-slate-500
            transition
            hover:bg-slate-100
            hover:text-slate-900
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-sky-500
            dark:text-slate-400
            dark:hover:bg-slate-800
            dark:hover:text-slate-200
          "
        >
          <PasswordVisibilityIcon
            visible={visible}
          />
        </button>
      </div>
    </div>
  );
}