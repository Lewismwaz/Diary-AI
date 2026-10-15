"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/button";
import StatusMessage from "@/components/ui/status-message";

type EditProfileFormProps = {
  firstName: string;
  lastName: string;
  email: string;
  onCancel: () => void;
};

type UpdateProfileResponse = {
  data?: {
    firstName: string;
    lastName: string;
    email: string;
  };

  error?: string;
};

export default function EditProfileForm({
  firstName: initialFirstName,
  lastName: initialLastName,
  email: initialEmail,
  onCancel,
}: EditProfileFormProps) {
  const router =
    useRouter();

  const [
    firstName,
    setFirstName,
  ] = useState(
    initialFirstName
  );

  const [
    lastName,
    setLastName,
  ] = useState(
    initialLastName
  );

  const [
    email,
    setEmail,
  ] = useState(
    initialEmail
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const normalizedFirstName =
    firstName.trim();

  const normalizedLastName =
    lastName.trim();

  const normalizedEmail =
    email.trim();

  const hasValidEmail =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalizedEmail
    );

  const hasChanges =
    normalizedFirstName !==
      initialFirstName ||
    normalizedLastName !==
      initialLastName ||
    normalizedEmail.toLowerCase() !==
      initialEmail.toLowerCase();

  const isFormValid =
    normalizedFirstName.length >=
      2 &&
    normalizedFirstName.length <=
      60 &&
    normalizedLastName.length >=
      2 &&
    normalizedLastName.length <=
      60 &&
    normalizedEmail.length <=
      320 &&
    hasValidEmail &&
    hasChanges;

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!isFormValid) {
      setError(
        "Please complete your account details correctly."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        await fetch(
          "/api/account/profile",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                firstName,
                lastName,
                email,
              }),
          }
        );

      const responseText =
        await response.text();

      let result:
        UpdateProfileResponse = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            ) as UpdateProfileResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to update your account."
        );
      }

      /*
       * Ask Auth.js to reload the trusted
       * profile fields into the JWT.
       */
      router.refresh();

      onCancel();
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
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

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
            htmlFor="settingsFirstName"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            First name
          </label>

          <input
            id="settingsFirstName"
            type="text"
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={60}
            value={firstName}
            onChange={(event) =>
              setFirstName(
                event.target.value
              )
            }
            className={
              inputClassName
            }
          />
        </div>

        <div>
          <label
            htmlFor="settingsLastName"
            className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Last name
          </label>

          <input
            id="settingsLastName"
            type="text"
            autoComplete="family-name"
            required
            minLength={2}
            maxLength={60}
            value={lastName}
            onChange={(event) =>
              setLastName(
                event.target.value
              )
            }
            className={
              inputClassName
            }
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="settingsEmail"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Email
        </label>

        <input
          id="settingsEmail"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          value={email}
          onChange={(event) =>
            setEmail(
              event.target.value
            )
          }
          className={
            inputClassName
          }
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={
            !isFormValid ||
            isSubmitting
          }
        >
          {isSubmitting
            ? "Saving..."
            : "Save changes"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={
            isSubmitting
          }
          onClick={
            onCancel
          }
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}