"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import SignOutButton from "@/components/auth/sign-out-button";

import {
  AppBrand,
} from "@/components/branding/app-brand";

type AppHeaderProps = {
  firstName: string;
};

export default function AppHeader({
  firstName,
}: AppHeaderProps) {
  const pathname =
    usePathname();

  const isTrends =
    pathname === "/trends" ||
    pathname.startsWith(
      "/trends/"
    );

  const isSettings =
    pathname === "/settings" ||
    pathname.startsWith(
      "/settings/"
    );

  const isJournal =
    pathname === "/dashboard" ||
    pathname.startsWith(
      "/entries"
    );

  const title =
    isTrends
      ? "Journal Trends"
      : isSettings
        ? "Settings"
        : `${firstName}'s Journal`;

  return (
    <header
      className="
        sticky top-0 z-40
        border-b border-slate-200
        bg-slate-50/95
        px-3 py-2
        backdrop-blur
        supports-[backdrop-filter]:bg-slate-50/85
        dark:border-slate-800
        dark:bg-slate-950/95
        dark:supports-[backdrop-filter]:bg-slate-950/85
        sm:px-6
        lg:px-8
      "
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-4">
        <AppBrand
          size="sm"
          href="/dashboard"
          priority
        />

        {/* Desktop controls */}
        <nav className="hidden items-center gap-5 sm:flex">
          <Link
            href="/dashboard"
            className={`text-sm font-semibold transition ${
              isJournal
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            }`}
          >
            Journal
          </Link>

          <Link
            href="/trends"
            className={`text-sm font-semibold transition ${
              isTrends
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            }`}
          >
            Trends
          </Link>

          <Link
            href="/settings"
            className={`text-sm font-semibold transition ${
              isSettings
                ? "text-sky-600 dark:text-sky-400"
                : "text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400"
            }`}
          >
            Settings
          </Link>

          <SignOutButton />

          <Link
            href="/entries/new"
            className="
              inline-flex min-h-9
              items-center justify-center
              whitespace-nowrap
              rounded-xl
              bg-sky-600
              px-3.5 py-1.5
              text-sm font-semibold
              text-white
              transition
              hover:bg-sky-700
              focus:outline-none
              focus:ring-2
              focus:ring-sky-500
              focus:ring-offset-2
              dark:focus:ring-offset-slate-950
            "
          >
            <span
              aria-hidden="true"
              className="mr-1.5 text-lg leading-none"
            >
              +
            </span>

            New entry
          </Link>
        </nav>
      </div>

      {/* Page identity */}
      <div className="mt-1 flex items-end justify-between gap-4 sm:mt-0.5">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
            {title}
          </h1>

          {isTrends && (
            <p className="mt-0.5 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
              Explore recurring themes,
              mood signals, activity
              patterns, and AI-generated
              insights across your journal.
            </p>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex shrink-0 items-center gap-2 sm:hidden">
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}