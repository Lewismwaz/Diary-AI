"use client";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type EditEntryFormProps = {
  entry: {
    id: string;
    title: string;
    cleanedContent: string;
  };
};

export default function EditEntryForm({
  entry,
}: EditEntryFormProps) {
  const router = useRouter();

  const [title, setTitle] =
    useState(entry.title);

  const [content, setContent] =
    useState(entry.cleanedContent);

  const [error, setError] =
    useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const hasChanges =
    title !== entry.title ||
    content !== entry.cleanedContent;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/entries/${entry.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title,
            cleanedContent: content,
          }),
        }
      );

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.error ??
            "Unable to update diary entry."
        );
      }

      router.push(
        `/entries/${entry.id}`
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-describedby={
        error
          ? "edit-entry-error"
          : undefined
      }
      className="space-y-6"
    >
      <div>
        <label
          htmlFor="title"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Title
        </label>

        <input
          id="title"
          name="title"
          type="text"
          value={title}
          onChange={(event) =>
            setTitle(
              event.target.value
            )
          }
          required
          maxLength={160}
          autoComplete="off"
          className="
            w-full rounded-xl
            border border-slate-300
            bg-white
            px-4 py-3
            text-slate-950
            outline-none
            transition
            focus:border-sky-500
            focus:ring-2
            focus:ring-sky-500/20
            dark:border-slate-700
            dark:bg-slate-900
            dark:text-white
          "
        />

        <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
          {title.length}/160
        </p>
      </div>

      <div>
        <label
          htmlFor="content"
          className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Diary entry
        </label>

        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(event) =>
            setContent(
              event.target.value
            )
          }
          required
          maxLength={50_000}
          rows={14}
          className="
            w-full resize-y
            rounded-xl
            border border-slate-300
            bg-white
            px-4 py-3
            leading-7
            text-slate-950
            outline-none
            transition
            focus:border-sky-500
            focus:ring-2
            focus:ring-sky-500/20
            dark:border-slate-700
            dark:bg-slate-900
            dark:text-white
          "
        />

        <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
          {content.length}/50000
        </p>
      </div>

      {error && (
        <p
          id="edit-entry-error"
          role="alert"
          className="
            rounded-xl
            border border-red-200
            bg-red-50
            px-4 py-3
            text-sm text-red-700
            dark:border-red-900
            dark:bg-red-950/60
            dark:text-red-300
          "
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          isSaving ||
          !hasChanges
        }
        className="
          rounded-xl
          bg-sky-600
          px-5 py-3
          font-semibold
          text-white
          transition
          hover:bg-sky-500
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      >
        {isSaving
          ? "Saving..."
          : "Save changes"}
      </button>
    </form>
  );
}