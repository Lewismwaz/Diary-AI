"use client";

import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ListenButton,
} from "@/components/tts/listen-button";

import {
  EmptyState,
} from "@/components/ui/empty-state";

type DashboardEntry = {
  id: string;
  title: string;
  cleanedContent: string;
  originalTranscript:
    | string
    | null;
  source: "TEXT" | "VOICE";
  entryDate: string;
  createdAt: string;
  updatedAt: string;
};

type DashboardEntriesProps = {
  entries: DashboardEntry[];
};

type SourceFilter =
  | "ALL"
  | "TEXT"
  | "VOICE";

type SortOption =
  | "newest"
  | "oldest"
  | "updated"
  | "title-az"
  | "title-za";

type MonthDefinition = {
  value: number;
  shortName: string;
  fullName: string;
  classes: string;
  activeClasses: string;
};

const MONTHS: MonthDefinition[] = [
  {
    value: 0,
    shortName: "Jan",
    fullName: "January",
    classes:
      "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 dark:border-sky-900/70 dark:bg-sky-950/30 dark:text-sky-300 dark:hover:bg-sky-950/60",
    activeClasses:
      "ring-2 ring-sky-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 1,
    shortName: "Feb",
    fullName: "February",
    classes:
      "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-900/70 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/60",
    activeClasses:
      "ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 2,
    shortName: "Mar",
    fullName: "March",
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/60",
    activeClasses:
      "ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 3,
    shortName: "Apr",
    fullName: "April",
    classes:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/60",
    activeClasses:
      "ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 4,
    shortName: "May",
    fullName: "May",
    classes:
      "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/60",
    activeClasses:
      "ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 5,
    shortName: "Jun",
    fullName: "June",
    classes:
      "border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:border-cyan-900/70 dark:bg-cyan-950/30 dark:text-cyan-300 dark:hover:bg-cyan-950/60",
    activeClasses:
      "ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 6,
    shortName: "Jul",
    fullName: "July",
    classes:
      "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-300 dark:hover:bg-orange-950/60",
    activeClasses:
      "ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 7,
    shortName: "Aug",
    fullName: "August",
    classes:
      "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/70 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/60",
    activeClasses:
      "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 8,
    shortName: "Sep",
    fullName: "September",
    classes:
      "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:border-teal-900/70 dark:bg-teal-950/30 dark:text-teal-300 dark:hover:bg-teal-950/60",
    activeClasses:
      "ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 9,
    shortName: "Oct",
    fullName: "October",
    classes:
      "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100 dark:border-fuchsia-900/70 dark:bg-fuchsia-950/30 dark:text-fuchsia-300 dark:hover:bg-fuchsia-950/60",
    activeClasses:
      "ring-2 ring-fuchsia-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 10,
    shortName: "Nov",
    fullName: "November",
    classes:
      "border-lime-200 bg-lime-50 text-lime-700 hover:bg-lime-100 dark:border-lime-900/70 dark:bg-lime-950/30 dark:text-lime-300 dark:hover:bg-lime-950/60",
    activeClasses:
      "ring-2 ring-lime-500 ring-offset-2 dark:ring-offset-slate-950",
  },
  {
    value: 11,
    shortName: "Dec",
    fullName: "December",
    classes:
      "border-pink-200 bg-pink-50 text-pink-700 hover:bg-pink-100 dark:border-pink-900/70 dark:bg-pink-950/30 dark:text-pink-300 dark:hover:bg-pink-950/60",
    activeClasses:
      "ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-slate-950",
  },
];

function getOrdinalSuffix(
  day: number
) {
  if (
    day >= 11 &&
    day <= 13
  ) {
    return "th";
  }

  switch (day % 10) {
    case 1:
      return "st";

    case 2:
      return "nd";

    case 3:
      return "rd";

    default:
      return "th";
  }
}

function formatEntryDate(
  dateString: string
) {
  const date =
    new Date(dateString);

  const weekday =
    new Intl.DateTimeFormat(
      "en-KE",
      {
        weekday: "short",
      }
    ).format(date);

  const month =
    new Intl.DateTimeFormat(
      "en-KE",
      {
        month: "long",
      }
    ).format(date);

  const time =
    new Intl.DateTimeFormat(
      "en-KE",
      {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    )
      .format(date)
      .replace(
        /\s(am|pm)$/i,
        (_, period: string) =>
          period.toLowerCase()
      );

  const day =
    date.getDate();

  return `${weekday}, ${day}${getOrdinalSuffix(
    day
  )} ${month} ${date.getFullYear()}, ${time}`;
}

function getLocalDateKey(
  dateString: string
) {
  const date =
    new Date(dateString);

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function DashboardEntries({
  entries,
}: DashboardEntriesProps) {
  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    sourceFilter,
    setSourceFilter,
  ] =
    useState<SourceFilter>(
      "ALL"
    );

  const [
    sortBy,
    setSortBy,
  ] =
    useState<SortOption>(
      "newest"
    );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState("");

  const [
    selectedYear,
    setSelectedYear,
  ] =
    useState<string>("ALL");

  const [
    selectedMonth,
    setSelectedMonth,
  ] =
    useState<number | null>(
      null
    );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(20);

  /*
   * Mobile: 20 entries/page.
   * sm and larger: 30 entries/page.
   */
  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(min-width: 640px)"
      );

    function updatePageSize() {
      setPageSize(
        mediaQuery.matches
          ? 30
          : 20
      );
    }

    updatePageSize();

    mediaQuery.addEventListener(
      "change",
      updatePageSize
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updatePageSize
      );
    };
  }, []);

  const availableYears =
    useMemo(() => {
      return Array.from(
        new Set(
          entries.map(
            (entry) =>
              new Date(
                entry.entryDate
              ).getFullYear()
          )
        )
      ).sort(
        (a, b) => b - a
      );
    }, [entries]);

  const monthCounts =
    useMemo(() => {
      const counts =
        Array<number>(12).fill(0);

      entries.forEach(
        (entry) => {
          const date =
            new Date(
              entry.entryDate
            );

          const matchesYear =
            selectedYear ===
              "ALL" ||
            date.getFullYear() ===
              Number(
                selectedYear
              );

          const matchesSource =
            sourceFilter ===
              "ALL" ||
            entry.source ===
              sourceFilter;

          if (
            matchesYear &&
            matchesSource
          ) {
            counts[
              date.getMonth()
            ] += 1;
          }
        }
      );

      return counts;
    }, [
      entries,
      selectedYear,
      sourceFilter,
    ]);

  const visibleEntries =
    useMemo(() => {
      const normalizedSearch =
        searchQuery
          .trim()
          .toLowerCase();

      const filtered =
        entries.filter(
          (entry) => {
            const entryDate =
              new Date(
                entry.entryDate
              );

            const matchesSource =
              sourceFilter ===
                "ALL" ||
              entry.source ===
                sourceFilter;

            const matchesYear =
              selectedYear ===
                "ALL" ||
              entryDate.getFullYear() ===
                Number(
                  selectedYear
                );

            const matchesMonth =
              selectedMonth ===
                null ||
              entryDate.getMonth() ===
                selectedMonth;

            const matchesDate =
              !selectedDate ||
              getLocalDateKey(
                entry.entryDate
              ) === selectedDate;

            const matchesSearch =
              !normalizedSearch ||
              entry.title
                .toLowerCase()
                .includes(
                  normalizedSearch
                ) ||
              entry.cleanedContent
                .toLowerCase()
                .includes(
                  normalizedSearch
                );

            return (
              matchesSource &&
              matchesYear &&
              matchesMonth &&
              matchesDate &&
              matchesSearch
            );
          }
        );

      return [...filtered].sort(
        (a, b) => {
          switch (sortBy) {
            case "oldest":
              return (
                new Date(
                  a.entryDate
                ).getTime() -
                new Date(
                  b.entryDate
                ).getTime()
              );

            case "updated":
              return (
                new Date(
                  b.updatedAt
                ).getTime() -
                new Date(
                  a.updatedAt
                ).getTime()
              );

            case "title-az":
              return a.title.localeCompare(
                b.title
              );

            case "title-za":
              return b.title.localeCompare(
                a.title
              );

            case "newest":
            default:
              return (
                new Date(
                  b.entryDate
                ).getTime() -
                new Date(
                  a.entryDate
                ).getTime()
              );
          }
        }
      );
    }, [
      entries,
      searchQuery,
      sourceFilter,
      selectedDate,
      selectedYear,
      selectedMonth,
      sortBy,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        visibleEntries.length /
          pageSize
      )
    );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const startIndex =
    (safeCurrentPage - 1) *
    pageSize;

  const paginatedEntries =
    visibleEntries.slice(
      startIndex,
      startIndex + pageSize
    );

  const firstVisibleNumber =
    visibleEntries.length === 0
      ? 0
      : startIndex + 1;

  const lastVisibleNumber =
    Math.min(
      startIndex + pageSize,
      visibleEntries.length
    );

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    sourceFilter !== "ALL" ||
    selectedDate !== "" ||
    selectedYear !== "ALL" ||
    selectedMonth !== null;

  const hasChangedControls =
    hasActiveFilters ||
    sortBy !== "newest";

  function clearFilters() {
    setSearchQuery("");
    setSourceFilter("ALL");
    setSelectedDate("");
    setSelectedYear("ALL");
    setSelectedMonth(null);
    setCurrentPage(1);
  }

  function resetControls() {
    clearFilters();
    setSortBy("newest");
  }

  function selectMonth(
    month: number
  ) {
    setSelectedMonth(
      (current) =>
        current === month
          ? null
          : month
    );

    setSelectedDate("");
    setCurrentPage(1);
  }

  function goToPage(
    page: number
  ) {
    const nextPage =
      Math.min(
        Math.max(page, 1),
        totalPages
      );

    setCurrentPage(
      nextPage
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <section>
      {/* Compact search / filters */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_140px_150px_150px_170px]">
          <div>
            <label
              htmlFor="journal-search"
              className="sr-only"
            >
              Search diary entries
            </label>

            <div className="relative">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                />

                <path d="m21 21-4.3-4.3" />
              </svg>

              <input
                id="journal-search"
                type="search"
                value={
                  searchQuery
                }
                onChange={(event) => {
                  setSearchQuery(
                    event.target.value
                  );

                  setCurrentPage(1);
                }}
                placeholder="Search journal..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="source-filter"
              className="sr-only"
            >
              Filter by source
            </label>

            <select
              id="source-filter"
              value={
                sourceFilter
              }
              onChange={(event) => {
                setSourceFilter(
                  event.target
                    .value as SourceFilter
                );

                setCurrentPage(1);
              }}
                            className="h-10 cursor-pointer w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ALL">
                All entries
              </option>

              <option value="TEXT">
                Text
              </option>

              <option value="VOICE">
                Voice
              </option>
            </select>
          </div>

          <div>
            <label
              htmlFor="date-filter"
              className="sr-only"
            >
              Filter by exact date
            </label>

            <input
              id="date-filter"
              type="date"
              value={
                selectedDate
              }
              onChange={(event) => {
                setSelectedDate(
                  event.target.value
                );

                if (
                  event.target.value
                ) {
                  setSelectedMonth(
                    null
                  );
                }

                setCurrentPage(1);
              }}
              className="h-10 cursor-pointer w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </div>

          <div>
            <label
              htmlFor="year-filter"
              className="sr-only"
            >
              Filter by year
            </label>

            <select
              id="year-filter"
              value={
                selectedYear
              }
              onChange={(event) => {
                setSelectedYear(
                  event.target.value
                );

                setCurrentPage(1);
              }}
              className="h-10 cursor-pointer w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ALL">
                All years
              </option>

              {availableYears.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="entry-sort"
              className="sr-only"
            >
              Sort diary entries
            </label>

            <select
              id="entry-sort"
              value={sortBy}
              onChange={(event) => {
                setSortBy(
                  event.target
                    .value as SortOption
                );

                setCurrentPage(1);
              }}
              className="h-10 cursor-pointer w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="newest">
                Newest first
              </option>

              <option value="oldest">
                Oldest first
              </option>

              <option value="updated">
                Recently updated
              </option>

              <option value="title-az">
                Title A–Z
              </option>

              <option value="title-za">
                Title Z–A
              </option>
            </select>
          </div>
        </div>

        {/* Month filter */}
        <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-12">
          {MONTHS.map(
            (month) => {
              const isActive =
                selectedMonth ===
                month.value;

              return (
                <button
                  key={
                    month.value
                  }
                  type="button"
                  title={
                    month.fullName
                  }
                  aria-pressed={
                    isActive
                  }
                  onClick={() =>
                    selectMonth(
                      month.value
                    )
                  }
                  className={`
                    min-w-0 rounded-lg
                    border px-1.5 py-1.5
                    text-center cursor-pointer
                    transition
                    ${month.classes}
                    ${
                      isActive
                        ? month.activeClasses
                        : ""
                    }
                  `}
                >
                  <span className="block truncate text-[11px] font-semibold sm:text-xs">
                    {
                      month.shortName
                    }
                  </span>

                  <span className="mt-0.5 block text-[10px] tabular-nums opacity-70">
                    {
                      monthCounts[
                        month.value
                      ]
                    }
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* Compact result summary */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <p
            className="text-xs text-slate-500 dark:text-slate-400"
            aria-live="polite"
          >
            {visibleEntries.length >
            0 ? (
              <>
                Showing{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {
                    firstVisibleNumber
                  }
                  –
                  {
                    lastVisibleNumber
                  }
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {
                    visibleEntries.length
                  }
                </span>{" "}
                matching{" "}
                {visibleEntries.length ===
                1
                  ? "entry"
                  : "entries"}

                {visibleEntries.length !==
                  entries.length &&
                  ` (${entries.length} total)`}
              </>
            ) : (
              <>
                No matching
                entries
              </>
            )}
          </p>

          {hasChangedControls && (
            <button
              type="button"
              onClick={
                resetControls
              }
              className="text-xs font-semibold text-sky-600 transition hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {visibleEntries.length ===
      0 ? (
        <EmptyState
          compact
          title="No matching entries"
          description="Try another search phrase, date, month, year, or source."
          action={
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="
                inline-flex min-h-10
                items-center justify-center
                rounded-lg
                border border-slate-300
                px-4
                text-sm font-semibold
                text-slate-700
                transition
                hover:bg-slate-50
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-sky-500
                focus-visible:ring-offset-2
                dark:border-slate-700
                dark:text-slate-200
                dark:hover:bg-slate-900
                dark:focus-visible:ring-offset-slate-950
              "
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <>
          {/*
           * 2 columns on mobile.
           * 5 columns on large desktop.
           */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {paginatedEntries.map(
              (entry) => (
                <article
                  key={entry.id}
                  className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-sky-800"
                >
                  <Link
                    href={`/entries/${entry.id}`}
                    className="flex min-w-0 flex-1 flex-col p-3 pb-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500 sm:p-4 sm:pb-0"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-2">
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                          entry.source ===
                          "VOICE"
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                            : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                        }`}
                      >
                        {entry.source ===
                        "VOICE"
                          ? "Voice"
                          : "Text"}
                      </span>

                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-sky-500 dark:text-slate-700"
                      >
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    </div>

                    <h2 className="mt-3 line-clamp-2 break-words text-sm font-bold leading-5 text-slate-900 transition group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400 sm:text-base">
                      {entry.title}
                    </h2>

                    <p className="mt-2 line-clamp-4 break-words text-xs leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                      {
                        entry.cleanedContent
                      }
                    </p>

                    <div className="mt-auto pt-3">
                      <time
                        dateTime={
                          entry.entryDate
                        }
                        className="block text-[10px] font-medium leading-4 text-slate-500 sm:text-xs"
                      >
                        {formatEntryDate(
                          entry.entryDate
                        )}
                      </time>
                    </div>
                  </Link>

                  <div className="mt-3 border-t border-slate-100 p-3 pt-3 dark:border-slate-800 sm:p-4 sm:pt-3">
                    <ListenButton
                      ownerId={`entry:${entry.id}`}
                      title={
                        entry.title
                      }
                      text={
                        entry.cleanedContent
                      }
                      date={
                        entry.entryDate
                      }
                      source={
                        entry.source
                      }
                    />
                  </div>
                </article>
              )
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Journal pagination"
              className="mt-6 flex flex-wrap items-center justify-center gap-2"
            >
              <button
                type="button"
                onClick={() =>
                  goToPage(
                    safeCurrentPage -
                      1
                  )
                }
                disabled={
                  safeCurrentPage ===
                  1
                }
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Previous
              </button>

              <span className="px-2 text-sm text-slate-500 dark:text-slate-400">
                Page{" "}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">
                  {
                    safeCurrentPage
                  }
                </strong>{" "}
                of{" "}
                <strong className="font-semibold text-slate-800 dark:text-slate-200">
                  {totalPages}
                </strong>
              </span>

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    safeCurrentPage +
                      1
                  )
                }
                disabled={
                  safeCurrentPage ===
                  totalPages
                }
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}