"use client";

import {
  useEffect,
} from "react";

type ErrorProps = {
  error: Error & {
    digest?: string;
  };

  reset: () => void;
};

export default function EntryError({
  error,
  reset,
}: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="
        flex min-h-screen
        items-center justify-center
        bg-slate-50
        px-4
        text-slate-950
        dark:bg-slate-950
        dark:text-white
      "
    >
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">
          Unable to load this entry
        </h1>

        <p className="mt-4 text-slate-600 dark:text-slate-400">
          The diary entry could not be loaded.
        </p>

        <button
          type="button"
          onClick={reset}
          className="
            mt-8 rounded-xl
            bg-sky-600
            px-5 py-3
            font-semibold
            text-white
            transition
            hover:bg-sky-500
          "
        >
          Try again
        </button>
      </div>
    </main>
  );
}