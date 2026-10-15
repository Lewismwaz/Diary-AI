"use client";

import {
  MouseEvent,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Button from "@/components/ui/button";
import StatusMessage from "@/components/ui/status-message";

type DeleteEntryDialogProps = {
  entryId: string;
};

export default function DeleteEntryDialog({
  entryId,
}: DeleteEntryDialogProps) {
  const router = useRouter();

  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  function openDialog() {
    setError("");
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    if (isDeleting) {
      return;
    }

    dialogRef.current?.close();
  }

  function handleBackdropClick(
    event: MouseEvent<HTMLDialogElement>
  ) {
    /*
     * When the user clicks the backdrop,
     * the dialog itself becomes the event target.
     *
     * Clicking actual content inside the dialog
     * produces a different target.
     */
    if (
      event.target === event.currentTarget
    ) {
      closeDialog();
    }
  }

  async function handleDelete() {
    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/entries/${entryId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const responseText =
          await response.text();

        let errorMessage =
          "Unable to delete diary entry.";

        if (responseText) {
          try {
            const data = JSON.parse(
              responseText
            ) as {
              error?: string;
            };

            errorMessage =
              data.error ??
              errorMessage;
          } catch {
            // Keep the fallback message.
          }
        }

        throw new Error(errorMessage);
      }

      dialogRef.current?.close();

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );

      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={openDialog}
      >
        Delete
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby="delete-entry-title"
        aria-describedby="delete-entry-description"
        onClick={handleBackdropClick}
        onCancel={(event) => {
          if (isDeleting) {
            event.preventDefault();
          }
        }}
        className="
          fixed
          inset-0
          m-auto
          w-[calc(100%-2rem)]
          max-w-md
          max-h-[calc(100dvh-2rem)]
          overflow-y-auto
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-0
          text-slate-950
          shadow-2xl
          dark:border-slate-800
          dark:bg-slate-950
          dark:text-white
          backdrop:bg-black/60
          backdrop:backdrop-blur-[2px]
        "
      >
        <div className="p-5 sm:p-6">
          <h2
            id="delete-entry-title"
            className="text-lg font-bold text-slate-950 dark:text-white sm:text-xl"
          >
            Delete diary entry?
          </h2>

          <p
            id="delete-entry-description"
            className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400"
          >
            This entry will be permanently
            deleted. This action cannot be
            undone.
          </p>

          {error && (
            <div className="mt-4">
              <StatusMessage
                type="error"
                message={error}
              />
            </div>
          )}

          <div
            className="
              mt-6
              flex
              flex-col-reverse
              gap-3
              sm:flex-row
              sm:justify-end
            "
          >
            <Button
              type="button"
              variant="secondary"
              onClick={closeDialog}
              disabled={isDeleting}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? "Deleting..."
                : "Delete permanently"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}