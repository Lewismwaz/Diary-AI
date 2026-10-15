"use client";

import {
  useEffect,
  useMemo,
} from "react";

import {
  useTTS,
} from "@/components/tts/tts-provider";

import type {
  TTSState,
} from "@/lib/tts/types";

import {
  TTS_VOICES,
  getTTSVoice,
} from "@/lib/tts/tts-voices";


const PLAYBACK_RATES = [
  0.9,
  0.95,
  1,
  1.05,
  1.10,
  1.15,
  1.2,
] as const;

export function TTSNarrationModal() {
  const {
    state,
    activeNarration,

    selectedSpeakerId,
    setSelectedSpeakerId,

    generatedSpeakerId,
    applySelectedVoice,

    playbackRate,
    setPlaybackRate,

    pause,
    resume,
    replay,
    stop,
    getAudioBlob,
  } = useTTS();

  const selectedVoice =
    getTTSVoice(selectedSpeakerId);

  const generatedVoice =
    generatedSpeakerId !== null
      ? getTTSVoice(
          generatedSpeakerId,
        )
      : undefined;

  const hasVoiceChange =
    generatedSpeakerId !== null &&
    selectedSpeakerId !==
      generatedSpeakerId;

  const isGenerating =
    state.status === "generating" ||
    state.status === "buffering";

  /*
   * Prevent the page underneath the modal
   * from scrolling while narration is open.
   */
  useEffect(() => {
    if (!activeNarration) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [activeNarration]);

  const words = useMemo(
    () =>
      activeNarration
        ? splitWords(
            activeNarration.text,
          )
        : [],
    [activeNarration],
  );

  if (!activeNarration) {
    return null;
  }

  /*
   * activeNarration is known to be non-null
   * from this point forward.
   *
   * Capture it as an immutable reference for
   * callbacks such as download().
   */
  const narration =
    activeNarration;

  const isPaused =
    state.status === "paused";

  const isFinished =
    state.status === "finished";

  const canPause =
    state.status === "playing" ||
    state.status === "buffering" ||
    state.status === "generating";

  const generationComplete =
    state.progress.generated >= 1;

  /*
   * Sherpa VITS currently gives us PCM
   * playback progress, not word-level
   * alignment timestamps.
   *
   * Therefore highlighting follows the
   * playback position proportionally.
   */
  const highlightedWordCount =
    getHighlightedWordCount(
      words.length,
      state.progress.played,
      state.progress.totalSeconds,
      isFinished,
    );

  async function togglePause() {
    if (isPaused) {
      await resume();
      return;
    }

    await pause();
  }

  function download() {
    const blob =
      getAudioBlob();

    if (!blob) {
      return;
    }

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download =
      createAudioFilename(
        narration.title,
        narration.date,
      );

    document.body.appendChild(
      anchor,
    );

    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tts-narration-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">

        {/* HEADER */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              {narration.source && (
                <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                  {
                    narration.source
                  }
                </span>
              )}

              {narration.date && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatNarrationDate(
                    narration.date,
                  )}
                </span>
              )}
            </div>

            <h2
              id="tts-narration-title"
              className="break-words text-lg font-bold text-slate-950 dark:text-white sm:text-xl"
            >
              {narration.title}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center gap-2">
                <VoiceIcon />

                <label
                  htmlFor="tts-voice"
                  className="text-sm font-medium text-slate-600 dark:text-slate-300"
                >
                  Voice
                </label>
              </div>

              <select
                id="tts-voice"
                value={selectedSpeakerId}
                onChange={(event) => {
                  setSelectedSpeakerId(
                    Number(event.target.value),
                  );
                }}
                className="h-9 cursor-pointer min-w-[130px] rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600"
              >
                {TTS_VOICES.map((voice) => (
                  <option
                    key={voice.id}
                    value={voice.id}
                  >
                    {voice.name}
                  </option>
                ))}
              </select>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {hasVoiceChange ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void applySelectedVoice();
                      }}
                      disabled={isGenerating}
                      className="
                        inline-flex items-center
                        justify-center rounded-lg
                        bg-slate-900 px-4 py-2 mb-3
                        text-xs font-semibold cursor-pointer
                        text-white transition
                        hover:bg-slate-700
                        disabled:cursor-not-allowed
                        disabled:opacity-50
                        dark:bg-white
                        dark:text-slate-900
                        dark:hover:bg-slate-200
                      "
                    >
                      Apply Voice
                    </button>

                    <span
                      className="
                        text-xs text-slate-500 mb-3
                        dark:text-slate-400
                      "
                    >
                      {generatedVoice?.name ??
                        "Current voice"}
                      {" → "}
                      {selectedVoice?.name ??
                        "Selected voice"}
                    </span>
                  </div>
                ) : (
                  <p
                    className="
                      mt-2 mb-3 text-xs
                      text-slate-500
                      dark:text-slate-400
                    "
                  >
                    Narrating with{" "}
                    <span className="font-medium">
                      {generatedVoice?.name ??
                        selectedVoice?.name ??
                        "Avery"}
                    </span>
                  </p>
                )}
              </div>

            </div>
          </div>

          <button
            type="button"
            onClick={stop}
            aria-label="Close narration"
            title="Close"
            className="inline-flex cursor-pointer h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* TEXT */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="whitespace-pre-wrap text-base leading-8 text-slate-700 dark:text-slate-300 sm:text-lg sm:leading-9">
            {words.map(
              (word, index) => {
                const highlighted =
                  index <
                  highlightedWordCount;

                return (
                  <span
                    key={`${index}-${word}`}
                    className={
                      highlighted
                        ? "rounded bg-sky-100 text-sky-950 transition-colors duration-150 dark:bg-sky-900/60 dark:text-sky-100"
                        : undefined
                    }
                  >
                    {word}
                  </span>
                );
              },
            )}
          </div>
        </div>

        {/* PLAYER */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:px-6">

          {/* PROGRESS */}
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-[width] duration-200"
              style={{
                width: `${getPlaybackPercent(
                  state.progress.played,
                  state.progress.totalSeconds,
                )}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

            {/* LEFT CONTROLS */}
            <div className="flex min-w-0 items-center gap-2">
              {isFinished ? (
                <PlayerButton
                  label="Replay"
                  onClick={() => {
                    void replay();
                  }}
                >
                  <ReplayIcon />
                </PlayerButton>
              ) : (
                <PlayerButton
                  label={
                    isPaused
                      ? "Resume"
                      : "Pause"
                  }
                  onClick={() => {
                    void togglePause();
                  }}
                  disabled={
                    !isPaused &&
                    !canPause
                  }
                >
                  {isPaused ? (
                    <PlayIcon />
                  ) : (
                    <PauseIcon />
                  )}
                </PlayerButton>
              )}

              <PlayerButton
                label="Stop"
                onClick={stop}
              >
                <StopIcon />
              </PlayerButton>
            </div>

            {/* STATUS */}
            <div className="text-center">
              <span className="whitespace-nowrap text-sm font-medium text-slate-500 dark:text-slate-400">
                {getStatusLabel(
                  state.status,
                )}
              </span>
            </div>

            {/* TIME + DOWNLOAD */}
            <div className="flex min-w-0 items-center justify-end gap-2">
              <span className="whitespace-nowrap text-sm tabular-nums text-slate-500 dark:text-slate-400">
                {formatDuration(
                  state.progress.played,
                )}
                {" / "}
                {formatDuration(
                  state.progress
                    .totalSeconds,
                )}
              </span>

              {generationComplete && (
                <PlayerButton
                  label="Download"
                  onClick={download}
                  iconOnly
                >
                  <DownloadIcon />
                </PlayerButton>
              )}
            </div>
          </div>

          {/* PLAYBACK SPEED */}
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
            <div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Playback speed
              </span>
            </div>

            <div
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-950"
              aria-label="Playback speed"
            >
              {PLAYBACK_RATES.map((rate) => {
                const selected =
                  playbackRate === rate;

                return (
                  <button
                    key={rate}
                    type="button"
                    disabled={!isFinished}
                    onClick={() => {
                      setPlaybackRate(rate);
                    }}
                    aria-pressed={selected}
                    className={[
                      "min-w-[42px] rounded-md px-2 py-1.5 text-xs font-semibold transition",
                      "disabled:cursor-not-allowed disabled:opacity-35",
                      selected
                        ? "bg-sky-500 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white",
                    ].join(" ")}
                  >
                    {rate}×
                  </button>
                );
              })}
            </div>
          </div>
          {state.error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {state.error}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

function splitWords(
  text: string,
): string[] {
  return (
    text.match(/\S+\s*/g) ?? []
  );
}

function getHighlightedWordCount(
  wordCount: number,
  playedSeconds: number,
  totalSeconds: number,
  finished: boolean,
): number {
  /*
   * Highlighting represents active narration.
   *
   * Once playback reaches the end, remove all
   * highlighting while keeping the modal open
   * for Replay / Download / Stop.
   */
  if (finished) {
    return 0;
  }

  if (
    wordCount === 0 ||
    totalSeconds <= 0
  ) {
    return 0;
  }

  const ratio =
    Math.min(
      1,
      Math.max(
        0,
        playedSeconds /
          totalSeconds,
      ),
    );

  return Math.min(
    wordCount,
    Math.floor(
      ratio * wordCount,
    ),
  );
}

function getPlaybackPercent(
  playedSeconds: number,
  totalSeconds: number,
): number {
  if (totalSeconds <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (playedSeconds /
        totalSeconds) *
        100,
    ),
  );
}

function createAudioFilename(
  title: string,
  date?: string,
): string {
  const safeTitle =
    sanitizeFilename(title) ||
    "diary-entry";

  const entryDate =
    date
      ? new Date(date)
      : new Date();

  const validDate =
    !Number.isNaN(
      entryDate.getTime(),
    );

  const finalDate =
    validDate
      ? entryDate
      : new Date();

  const year =
    finalDate.getFullYear();

  const month =
    String(
      finalDate.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      finalDate.getDate(),
    ).padStart(2, "0");

  const hours24 =
    finalDate.getHours();

  const hours12 =
    hours24 % 12 || 12;

  const minutes =
    String(
      finalDate.getMinutes(),
    ).padStart(2, "0");

  const period =
    hours24 >= 12
      ? "PM"
      : "AM";

  return `${safeTitle}-${year}-${month}-${day}-${hours12}-${minutes}-${period}.wav`;
}

function sanitizeFilename(
  value: string,
): string {
  return value
    .trim()
    .replace(
      /[<>:"/\\|?*\u0000-\u001F]/g,
      "",
    )
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 100);
}

function formatNarrationDate(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-KE",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
  ).format(date);
}

function formatDuration(
  seconds: number,
): string {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0s";
  }

  const wholeSeconds =
    Math.floor(seconds);

  if (wholeSeconds < 60) {
    return `${wholeSeconds}s`;
  }

  const minutes =
    Math.floor(
      wholeSeconds / 60,
    );

  const remaining =
    wholeSeconds % 60;

  return `${minutes}:${String(
    remaining,
  ).padStart(2, "0")}`;
}

function getStatusLabel(
  status: TTSState["status"],
): string {
  switch (status) {
    case "initializing":
      return "Loading voice…";

    case "generating":
      return "Preparing audio…";

    case "buffering":
      return "Buffering…";

    case "playing":
      return "Playing";

    case "paused":
      return "Paused";

    case "finished":
      return "Finished";

    case "error":
      return "Playback error";

    default:
      return "";
  }
}

function PlayerButton({
  children,
  label,
  onClick,
  disabled = false,
  iconOnly = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={[
        "inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700",
        "transition hover:bg-slate-100",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800",
        iconOnly
          ? "w-9"
          : "gap-1.5 px-3 text-sm font-medium",
      ].join(" ")}
    >
      {children}

      {!iconOnly && (
        <span>{label}</span>
      )}
    </button>
  );
}

function ReplayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      cursor="pointer"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </svg>
  );
}

function VoiceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-slate-400"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      cursor="pointer"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      cursor="pointer"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="5"
        width="4"
        height="14"
        rx="1"
      />
      <rect
        x="14"
        y="5"
        width="4"
        height="14"
        rx="1"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      cursor="pointer"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        rx="2"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      cursor="pointer"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}