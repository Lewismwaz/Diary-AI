import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import DashboardEntries from "@/components/diary/dashboard-entries";

import {
  EmptyState,
} from "@/components/ui/empty-state";

import {
  diaryService,
} from "@/lib/diary-service";

export const dynamic =
  "force-dynamic";

function getCopyrightYear() {
  const startYear = 2026;

  const currentYear =
    new Date().getFullYear();

  return currentYear >
    startYear
    ? `${startYear} - ${currentYear}`
    : `${startYear}`;
}

export default async function DashboardPage() {
  const session =
    await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const entries =
    await diaryService.listEntries(
      session.user.id
    );

  /*
   * Server Component -> Client Component
   *
   * Convert Date objects to strings so
   * the client receives serializable data.
   */
  const dashboardEntries =
    entries.map(
      (entry) => ({
        id: entry.id,

        title:
          entry.title,

        cleanedContent:
          entry.cleanedContent,

        originalTranscript:
          entry.originalTranscript,

        source:
          entry.source,

        entryDate:
          entry.entryDate.toISOString(),

        createdAt:
          entry.createdAt.toISOString(),

        updatedAt:
          entry.updatedAt.toISOString(),
      })
    );

  return (
    <>
      <main className="mx-auto w-full max-w-[1600px] px-3 pb-24 pt-4 sm:px-6 sm:pb-8 lg:px-8">
        {entries.length === 0 ? (
          <EmptyState
            title="Your journal is waiting"
            description="Capture your first thought, memory, experience, or reflection and begin building your personal journal."
            action={
              <Link
                href="/entries/new"
                className="
                  inline-flex min-h-11
                  items-center justify-center
                  rounded-xl
                  bg-sky-600
                  px-5 py-2.5
                  text-sm font-semibold
                  text-white
                  shadow-sm
                  transition
                  hover:bg-sky-500
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-sky-400
                  focus-visible:ring-offset-2
                  dark:focus-visible:ring-offset-slate-950
                "
              >
                + New Entry
              </Link>
            }
          />
        ) : (
          <DashboardEntries
            entries={
              dashboardEntries
            }
          />
        )}
      </main>

      <footer className="hidden border-t border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950 sm:block">
        <p className="text-center text-xs leading-5 text-slate-500 sm:text-sm">
          Copyright{" "}
          <a
            href="https://github.com/Yavotu"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sky-600 transition hover:text-sky-700 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            Yavotu
          </a>{" "}
          ©{" "}
          {getCopyrightYear()}{" "}
          | All Rights Reserved.
        </p>
      </footer>
    </>
  );
}