"use client";

import {
  useEffect,
  useState,
} from "react";

import type {
  DiaryTrendSynthesis,
  DiaryTrendSynthesisMeta,
  DiaryTrendsResult,
  TrendPeriod,
} from "@/domain/ai/diary-trends.schema";

import TrendFrequencyChart from "@/components/diary/trend-frequency-chart";
import { ListenButton } from "@/components/tts/listen-button";

import {
  EmptyState,
} from "@/components/ui/empty-state";

type TrendsData =
  DiaryTrendsResult & {
    synthesis:
      DiaryTrendSynthesis | null;

    synthesisMeta:
      DiaryTrendSynthesisMeta | null;

    aiSynthesisEnabled: boolean;
  };

const PERIODS: Array<{
  value: TrendPeriod;
  label: string;
}> = [
  {
    value: "7d",
    label: "7 Days",
  },
  {
    value: "30d",
    label: "30 Days",
  },
  {
    value: "90d",
    label: "90 Days",
  },
];

function formatPercentage(
  value: number
) {
  return `${Math.round(
    value * 100
  )}%`;
}

function formatGeneratedAt(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  ).format(date);
}

function formatLabel(
  value: string
) {
  if (!value) {
    return value;
  }

  return value
    .split(" ")
    .map((word) => {
      if (
        word.toLowerCase() ===
        "ai"
      ) {
        return "AI";
      }

      return (
        word.charAt(0)
          .toUpperCase() +
        word.slice(1)
      );
    })
    .join(" ");
}

export default function AITrends() {
  const [
    period,
    setPeriod,
  ] =
    useState<TrendPeriod>(
      "30d"
    );

  const [
    data,
    setData,
  ] =
    useState<
      TrendsData | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    retryCount,
    setRetryCount,
  ] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTrends() {
      try {
        const response =
          await fetch(
            `/api/ai/trends?period=${period}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Unable to load AI trends."
          );
        }

        if (!cancelled) {
          setData(
            result.data
          );

          setError(null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error(
          "Failed to load AI trends:",
          error
        );

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load AI trends."
          );

          setIsLoading(false);
        }
      }
    }

    void loadTrends();

    return () => {
      cancelled = true;
    };
  }, [
    period,
    retryCount,
  ]);

  function handlePeriodChange(
    selectedPeriod:
      TrendPeriod
  ) {
    if (
      selectedPeriod === period
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setPeriod(
      selectedPeriod
    );
  }

  const narrationText =
    data
      ? createTrendsNarration(
          period,
          data
        )
      : "";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Journal Intelligence
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            AI Trends
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Explore recurring
            themes, moods, and
            patterns across your
            analyzed journal
            entries.
          </p>
        </div>

        <div className="inline-flex w-full rounded-xl bg-slate-100 p-1 dark:bg-slate-900 sm:w-auto">
          {PERIODS.map(
            (option) => {
              const active =
                option.value ===
                period;

              return (
                <button
                  key={
                    option.value
                  }
                  type="button"
                  onClick={() =>
                    handlePeriodChange(
                      option.value
                    )
                  }
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition sm:flex-none ${
                    active
                      ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  {
                    option.label
                  }
                </button>
              );
            }
          )}
        </div>
      </div>

      {!isLoading &&
        !error &&
        data &&
        data.analyzedEntries > 0 && (
          <div className="mt-5">
            <ListenButton
              ownerId={`trends:${period}`}
              title={`${getPeriodLabel(
                period
              )} Journal Trends`}
              text={narrationText}
              source="AI Trends"
            />
          </div>
        )}

      {isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            1,
            2,
            3,
          ].map(
            (item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
              />
            )
          )}
        </div>
      )}

      {!isLoading &&
        error && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
            <p className="font-semibold text-red-700 dark:text-red-300">
              AI trends
              could not be
              loaded.
            </p>

            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setError(null);

                setRetryCount(
                  (current) =>
                    current + 1
                );
              }}
              className="mt-4 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
            >
              Try again
            </button>
          </div>
        )}

      {!isLoading &&
        !error &&
        data &&
        data.totalEntries === 0 && (
          <div className="mt-8">
            <EmptyState
              compact
              title="No journal entries in this period"
              description="There are no journal entries within the selected time period. Try another period or continue writing to build your trends over time."
            />
          </div>
        )}

      {!isLoading &&
        !error &&
        data &&
        data.totalEntries >
          0 && (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <MetricCard
                label="Journal Entries"
                value={String(
                  data.totalEntries
                )}
                description="Entries in the selected period"
              />

              <MetricCard
                label="Analyzed Entries"
                value={String(
                  data.analyzedEntries
                )}
                description="Entries with AI insights"
              />

              <MetricCard
                label="Analysis Coverage"
                value={formatPercentage(
                  data.analysisCoverage
                )}
                description="Share of entries included in AI patterns"
                progress={
                  data.analysisCoverage
                }
              />
            </div>

            {data.analyzedEntries === 0 ? (
              <div className="mt-6">
                <EmptyState
                  compact
                  title="No analyzed entries yet"
                  description="Analyze your journal entries to begin discovering topics, moods, action items, and eventually cross-entry patterns."
                />
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  <TrendFrequencyChart
                    title="Topic Frequency"
                    description="Most frequently identified topics across analyzed entries."
                    items={
                      data.topics
                    }
                    emptyMessage="No topics were identified."
                  />

                  <TrendFrequencyChart
                    title="Mood Distribution"
                    description="Mood signals identified across analyzed entries."
                    items={
                      data.moods
                    }
                    emptyMessage="No clear mood signals were identified."
                  />
                </div>

                <div className="mt-6">
                  <TrendList
                    title="Action Items"
                    items={
                      data.actionItems
                    }
                    emptyMessage="No recurring action items were identified."
                  />
                </div>

                {data.synthesis ? (
                  <SynthesisSection
                    synthesis={
                      data.synthesis
                    }
                    synthesisMeta={
                      data.synthesisMeta
                    }
                  />
                ) : !data.aiSynthesisEnabled ? (
                  <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-900/60 dark:bg-violet-950/20">
                    <h3 className="font-semibold text-violet-950 dark:text-violet-200">
                      AI Pattern Analysis
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-violet-800 dark:text-violet-300">
                      AI trend synthesis is
                      disabled in Settings →
                      Privacy & AI. Your calculated
                      journal statistics and
                      frequencies remain available.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      AI Pattern Analysis
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      At least two analyzed entries
                      are needed to generate
                      meaningful cross-entry
                      patterns.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
  progress,
}: {
  label: string;
  value: string;
  description: string;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>

      {progress !==
        undefined && (
        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          role="progressbar"
          aria-label={
            label
          }
          aria-valuemin={
            0
          }
          aria-valuemax={
            100
          }
          aria-valuenow={
            Math.round(
              progress *
                100
            )
          }
        >
          <div
            className="h-full rounded-full bg-slate-900 transition-[width] duration-500 dark:bg-slate-200"
            style={{
              width:
                `${Math.round(
                  progress *
                    100
                )}%`,
            }}
          />
        </div>
      )}

      <p className="mt-2 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function TrendList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: Array<{
    label: string;
    count: number;
  }>;
  emptyMessage: string;
}) {
  const visibleItems =
    items.slice(
      0,
      8
    );

  return (
    <div className="h-full rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
      <h3 className="font-semibold text-slate-900 dark:text-white">
        {title}
      </h3>

      {visibleItems.length ===
      0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {
            emptyMessage
          }
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {visibleItems.map(
            (item) => (
              <div
                key={
                  item.label
                }
                className="flex items-center justify-between gap-4"
              >
                <span className="min-w-0 text-sm text-slate-700 dark:text-slate-300">
                  {formatLabel(
                    item.label
                  )}
                </span>

                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {
                    item.count
                  }
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function getPeriodLabel(
  period: TrendPeriod
): string {
  switch (period) {
    case "7d":
      return "7 Day";

    case "30d":
      return "30 Day";

    case "90d":
      return "90 Day";
  }
}

function createTrendsNarration(
  period: TrendPeriod,
  data: TrendsData
): string {
  const sections: string[] = [];

  const periodLabel =
    getPeriodLabel(period);

  sections.push(
    `Here is your ${periodLabel.toLowerCase()} journal trends report.`
  );

  sections.push(
    `You wrote ${data.totalEntries} ${
      data.totalEntries === 1
        ? "journal entry"
        : "journal entries"
    } during this period. ` +
      `${data.analyzedEntries} ${
        data.analyzedEntries === 1
          ? "entry was"
          : "entries were"
      } included in the AI analysis. ` +
      `Analysis coverage was ${formatPercentage(
        data.analysisCoverage
      )}.`
  );

  if (data.topics.length > 0) {
    sections.push(
      `Most frequent topics. ${data.topics
        .slice(0, 8)
        .map(
          (item, index) =>
            `${index + 1}. ${formatLabel(
              item.label
            )}, appearing ${item.count} ${
              item.count === 1
                ? "time"
                : "times"
            }`
        )
        .join(". ")}.`
    );
  }

  if (data.moods.length > 0) {
    sections.push(
      `Mood distribution. ${data.moods
        .slice(0, 8)
        .map(
          (item, index) =>
            `${index + 1}. ${formatLabel(
              item.label
            )}, appearing ${item.count} ${
              item.count === 1
                ? "time"
                : "times"
            }`
        )
        .join(". ")}.`
    );
  }

  if (data.actionItems.length > 0) {
    sections.push(
      `Recurring action items. ${data.actionItems
        .slice(0, 8)
        .map(
          (item, index) =>
            `${index + 1}. ${formatLabel(
              item.label
            )}`
        )
        .join(". ")}.`
    );
  }

  if (data.synthesis) {
    const synthesis =
      data.synthesis;

    if (synthesis.overview.trim()) {
      sections.push(
        `AI overview. ${synthesis.overview.trim()}`
      );
    }

    if (
      synthesis.recurringThemes.length > 0
    ) {
      const themes =
        synthesis.recurringThemes.map(
          (theme, index) => {
            const evidence =
              theme.evidence.length > 0
                ? ` Supporting observations include ${theme.evidence.join(
                    ". "
                  )}.`
                : "";

            return `${index + 1}. ${theme.theme}.${evidence}`;
          }
        );

      sections.push(
        `Recurring themes. ${themes.join(
          " "
        )}`
      );
    }

    if (
      synthesis.observedPatterns.length >
      0
    ) {
      sections.push(
        `Observed patterns. ${synthesis.observedPatterns
          .map(
            (pattern, index) =>
              `${index + 1}. ${pattern}`
          )
          .join(" ")}`
      );
    }

    if (
      synthesis.suggestedFocusAreas
        .length > 0
    ) {
      sections.push(
        `Suggested focus areas. ${synthesis.suggestedFocusAreas
          .map(
            (area, index) =>
              `${index + 1}. ${area}`
          )
          .join(" ")}`
      );
    }
  }

  return sections.join("\n\n");
}

function SynthesisSection({
  synthesis,
  synthesisMeta,
}: {
  synthesis:
    DiaryTrendSynthesis;

  synthesisMeta:
    DiaryTrendSynthesisMeta | null;
}) {
  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          AI Overview
        </p>

        {synthesisMeta && (
          <p className="mt-3 text-xs text-slate-400">
            Last generated{" "}
            {formatGeneratedAt(
              synthesisMeta.generatedAt
            )}
          </p>
        )}

        <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
          {
            synthesis.overview
          }
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Recurring Themes
          </h3>

          {synthesis
            .recurringThemes
            .length ===
          0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No recurring
              themes were
              identified.
            </p>
          ) : (
            <div className="mt-4 space-y-5">
              {synthesis
                .recurringThemes
                .map(
                  (
                    theme,
                    index
                  ) => (
                    <div
                      key={`${theme.theme}-${index}`}
                    >
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {
                          theme.theme
                        }
                      </p>

                      <ul className="mt-2 space-y-1.5">
                        {theme.evidence.map(
                          (
                            evidence,
                            evidenceIndex
                          ) => (
                            <li
                              key={
                                evidenceIndex
                              }
                              className="text-sm leading-6 text-slate-500"
                            >
                              •{" "}
                              {
                                evidence
                              }
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )
                )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-white">
            Observed Patterns
          </h3>

          {synthesis
            .observedPatterns
            .length ===
          0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No clear
              cross-entry
              patterns were
              identified.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {synthesis
                .observedPatterns
                .map(
                  (
                    pattern,
                    index
                  ) => (
                    <li
                      key={
                        index
                      }
                      className="text-sm leading-6 text-slate-600 dark:text-slate-400"
                    >
                      •{" "}
                      {
                        pattern
                      }
                    </li>
                  )
                )}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Suggested Focus Areas
        </h3>

        {synthesis
          .suggestedFocusAreas
          .length ===
        0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No additional
            focus areas were
            suggested.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {synthesis
              .suggestedFocusAreas
              .map(
                (
                  area,
                  index
                ) => (
                  <li
                    key={
                      index
                    }
                    className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-900 dark:text-slate-400"
                  >
                    {
                      area
                    }
                  </li>
                )
              )}
          </ul>
        )}
      </div>

      <p className="text-xs leading-5 text-slate-400">
        AI-generated patterns
        are based only on
        entries that have AI
        analysis and may not
        represent every journal
        entry in the selected
        period.
      </p>
    </div>
  );
}