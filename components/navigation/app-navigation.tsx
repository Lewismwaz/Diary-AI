"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

export default function AppNavigation() {
  const pathname =
    usePathname();

  const isJournal =
    pathname ===
      "/dashboard" ||
    pathname.startsWith(
      "/entries"
    );

  const isSettings =
    pathname ===
      "/settings" ||
    pathname.startsWith(
      "/settings/"
    );

  const isTrends =
    pathname ===
      "/trends" ||
    pathname.startsWith(
      "/trends/"
    );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-4">
        <NavigationItem
          href="/dashboard"
          label="Journal"
          active={isJournal}
          icon={
            <JournalIcon />
          }
        />

        <Link
          href="/entries/new"
          aria-label="Create new diary entry"
          className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-2xl font-light leading-none text-white shadow-sm">
            +
          </span>

          <span>
            New
          </span>
        </Link>

        <NavigationItem
          href="/trends"
          label="Trends"
          active={isTrends}
          icon={
            <TrendsIcon />
          }
        />

        <NavigationItem
          href="/settings"
          label="Settings"
          active={isSettings}
          icon={
            <SettingsIcon />
          }
        />
      </div>
    </nav>
  );
}

function NavigationItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-1 text-xs font-medium transition ${
        active
          ? "text-sky-600 dark:text-sky-400"
          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      }`}
    >
      {icon}

      <span>
        {label}
      </span>
    </Link>
  );
}

function JournalIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.75 5.75A2.75 2.75 0 0 1 7.5 3h10.75a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7.5a2.75 2.75 0 0 1-2.75-2.75V5.75Z"
      />

      <path
        strokeLinecap="round"
        d="M8 3v18M11 8h5M11 12h5"
      />
    </svg>
  );
}

function TrendsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 19V11M12 19V5M19 19v-8"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z"
      />

      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.06 3.8l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9c.14.38.36.72.66 1 .3.27.69.4 1.1.4H21v4h-.1a1.7 1.7 0 0 0-1.5.6Z"
      />
    </svg>
  );
}