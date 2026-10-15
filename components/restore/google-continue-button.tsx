
"use client";

import { useState } from "react";

export default function GoogleContinueButton() {
  const [loading, setLoading] = useState(false);

  return (
    <a
      href="/api/restore/google"
      aria-disabled={loading}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }

        setLoading(true);
      }}
      className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 font-semibold text-white transition-colors ${
        loading
          ? "cursor-wait bg-blue-400"
          : "bg-blue-600 hover:bg-blue-700"
      }`}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
      )}

      {loading ? "Please wait..." : "Continue with Google"}
    </a>
  );
}
