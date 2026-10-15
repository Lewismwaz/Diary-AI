"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EmailVerifiedTransition() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(10);

  useEffect(() => {
    const startedAt = Date.now();

    const interval = window.setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - startedAt) / 1000
      );

      const remaining = Math.max(0, 10 - elapsed);

      setSecondsLeft(remaining);

      if (remaining === 0) {
        window.clearInterval(interval);
        router.replace("/restore?step=account-preview");
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <section className="space-y-5">
      <div
        role="status"
        className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      >
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-2xl">
            ✓
          </span>

          <h2 className="text-lg font-semibold">
            Recovery email verified successfully
          </h2>
        </div>

        <p className="mt-3 text-sm">
          Your recovery email has been verified using
          the six-digit security code.
        </p>

        <p className="mt-2 text-sm">
          Your Google account, encrypted backup, and
          recovery email have now been verified.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h3 className="font-semibold">
          Preparing account recovery
        </h3>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          You will continue automatically in{" "}
          <strong>{secondsLeft} seconds</strong>.
        </p>
      </div>

      <button
        type="button"
        onClick={() =>
          router.replace("/restore?step=account-preview")
        }
        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
      >
        Continue Now
      </button>
    </section>
  );
}