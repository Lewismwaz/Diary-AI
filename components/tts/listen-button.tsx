"use client";

import {
  useTTS,
} from "@/components/tts/tts-provider";

type ListenButtonProps = {
  ownerId: string;

  title: string;
  text: string;

  date?: string;
  source?: string;
};

export function ListenButton({
  ownerId,
  title,
  text,
  date,
  source,
}: ListenButtonProps) {
  const {
    speak,
  } = useTTS();

  async function listen() {
    if (!text.trim()) {
      return;
    }

    await speak(
      {
        ownerId,
        title,
        text,
        date,
        source,
      },
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        void listen();
      }}
      disabled={!text.trim()}
      className="
        inline-flex min-h-11 items-center justify-center gap-2
        rounded-xl bg-sky-600 hover:bg-sky-500 cursor-pointer px-4 py-2
        text-sm font-semibold text-white
        shadow-sm
        transition
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-sky-400
        focus-visible:ring-offset-2
        focus-visible:ring-offset-white
        disabled:cursor-not-allowed
        disabled:opacity-50
        dark:focus-visible:ring-offset-slate-950
      "
    >
      <SpeakerIcon />
      <span>Listen</span>
    </button>
  );
}

function SpeakerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}