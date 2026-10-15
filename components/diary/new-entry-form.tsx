"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import VoiceRecorder from "@/components/diary/voice-recorder";
import Button from "@/components/ui/button";

type EntrySource =
  | "TEXT"
  | "VOICE";

type ApiResponse = {
  data?: unknown;
  error?: string;
};

type CleanEntryResponse = {
  data?: {
    cleanedContent?: string;
  };
  error?: string;
};

type NewEntryFormProps = {
  allowVoiceTranscription: boolean;
  allowAIProcessing: boolean;
};

export function NewEntryForm({
  allowVoiceTranscription,
  allowAIProcessing,
}: NewEntryFormProps) {
  const router = useRouter();

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  /*
   * This is deliberately separate
   * from content.
   *
   * Once a voice transcription has
   * been produced, this preserves the
   * original machine transcript even
   * if the user edits the diary text.
   */
  const [
    preCleaningDraft,
    setPreCleaningDraft,
  ] = useState<string | null>(null);

  const [
    originalTranscript,
    setOriginalTranscript,
  ] = useState<string | null>(
    null
  );

  const [source, setSource] =
    useState<EntrySource>("TEXT");

  const [error, setError] =
    useState<string | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    isCleaning,
    setIsCleaning,
  ] = useState(false);

  function handleTranscriptReady(
    transcript: string
  ) {
    /*
     * Preserve the raw transcription.
     *
     * Future edits to `content` do not
     * change this value.
     */
    setOriginalTranscript(
      transcript
    );

    /*
     * The transcript becomes the
     * editable diary draft.
     */
    setContent(transcript);

    /*
     * This entry originated from
     * microphone audio.
     */
    setSource("VOICE");

    setError(null);
  }

  async function handleCleanWithAI() {
    const currentContent =
      content.trim();

    if (!currentContent) {
      setError(
        "Write or transcribe some diary content first."
      );

      return;
    }

    setError(null);

    /*
     * Preserve exactly what the user had
     * before this AI-cleaning operation.
     *
     * Do this before calling the API so
     * the transformation is reversible.
     */
    setPreCleaningDraft(content);

    setIsCleaning(true);

    try {
      const response =
        await fetch(
          "/api/ai/clean-entry",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              content:
                currentContent,
            }),
          }
        );

      const responseText =
        await response.text();

      let result:
        CleanEntryResponse = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            ) as CleanEntryResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to clean the diary entry."
        );
      }

      const cleanedContent =
        result.data
          ?.cleanedContent
          ?.trim();

      if (!cleanedContent) {
        throw new Error(
          "The AI returned an empty diary entry."
        );
      }

      setContent(
        cleanedContent
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to clean the diary entry."
      );
    } finally {
      setIsCleaning(false);
    }
  }

  function handleRestoreDraft() {
    if (preCleaningDraft === null) {
      return;
    }

    setContent(preCleaningDraft);
    setPreCleaningDraft(null);
    setError(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(
        "/api/entries",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            title,
            cleanedContent:
              content,

            originalTranscript:
              source === "VOICE"
                ? originalTranscript
                : null,

            source,
          }),
        }
      );

      /*
       * Do not immediately call
       * response.json().
       *
       * Framework/server failures can
       * occasionally return an empty
       * or non-JSON response.
       */
      const responseText =
        await response.text();

      let result: ApiResponse = {};

      if (responseText) {
        try {
          result = JSON.parse(
            responseText
          ) as ApiResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            `Unable to save entry. Server returned ${response.status}.`
        );
      }

      router.push(
        "/dashboard"
      );

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <VoiceRecorder
        onTranscriptReady={
          handleTranscriptReady
        }
        allowTranscription={
          allowVoiceTranscription
        }
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div>
          <label
            htmlFor="title"
            className="mb-2 block text-sm font-medium"
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
            maxLength={160}
            required
            autoComplete="off"
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700"
            placeholder="A short title for today"
          />

          <p className="mt-2 text-right text-xs text-slate-500">
            {title.length}/160
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="content"
              className="block text-sm font-medium"
            >
              Diary entry
            </label>

            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 dark:border-slate-700">
              {source === "VOICE"
                ? "Voice entry"
                : "Text entry"}
            </span>
          </div>

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
            className="w-full resize-y rounded-xl border border-slate-300 bg-transparent px-3 py-3 leading-7 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700"
            placeholder="Write what happened, what you felt, or record your thoughts above..."
          />

          <div className="mt-2 flex items-start justify-between gap-4">
            <p className="text-xs text-slate-500">
              {source === "VOICE"
                ? "The original transcription is preserved separately. You can safely edit this diary entry."
                : "Write directly or use the voice recorder above."}
            </p>

            <p className="shrink-0 text-xs text-slate-500">
              {content.length}/50000
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-violet-950 dark:text-violet-200">
                AI writing cleanup
              </p>

              <p className="mt-1 text-xs leading-5 text-violet-800/80 dark:text-violet-300/70">
                {!allowAIProcessing
                  ? "AI cleanup is disabled in Privacy & AI settings. You can continue writing and saving entries normally."
                  : preCleaningDraft !== null
                    ? "AI cleanup applied. Review the result or restore your previous draft."
                    : "Improve grammar, punctuation, readability, and speech artifacts while preserving your meaning."}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 sm:min-w-[240px]">
              {preCleaningDraft !== null && (
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  disabled={
                    isCleaning ||
                    isSaving
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200 dark:hover:bg-violet-900"
                >
                  Restore previous draft
                </button>
              )}

              <button
                type="button"
                onClick={handleCleanWithAI}
                disabled={
                  !allowAIProcessing ||
                  isCleaning ||
                  isSaving ||
                  !content.trim()
                }
                className="inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCleaning
                  ? "Cleaning..."
                  : preCleaningDraft !== null
                    ? "Clean again"
                    : "Clean with AI"}
              </button>

              {!allowAIProcessing && (
                <p className="basis-full mr-2 text-center text-xs leading-5 text-violet-700 sm:text-nowrap dark:text-violet-300">
                  Re-enable AI diary
                  processing: Settings →
                  Privacy & AI.
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p
            id="new-entry-error"
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={
            isSaving ||
            isCleaning ||
            !title.trim() ||
            !content.trim()
          }
        >
          {isSaving
            ? "Saving..."
            : "Save entry"}
        </Button>
      </form>
    </div>
  );
}