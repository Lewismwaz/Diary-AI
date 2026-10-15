"use client";

import {
  useEffect,
  useState,
} from "react";

import { ListenButton } from "@/components/tts/listen-button";

type AIAnalysis = {
  id: string;
  diaryEntryId: string;

  summary: string;

  moodLabel:
    | string
    | null;

  moodConfidence:
    | number
    | null;

  topics: string[];

  importantEvents: string[];

  actionItems: string[];

  recommendations: unknown;

  model:
    | string
    | null;

  promptVersion:
    | string
    | null;

  createdAt: string;
  updatedAt: string;
};

type AnalysisResponse = {
  data?: AIAnalysis | null;
  error?: string;
};

type AIInsightsProps = {
  entryId: string;
  allowAIProcessing: boolean;
};

function getRecommendations(
  value: unknown
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item
    ): item is string =>
      typeof item === "string"
  );
}

export default function AIInsights({
  entryId,
  allowAIProcessing,
}: AIInsightsProps) {
  const [
    analysis,
    setAnalysis,
  ] =
    useState<AIAnalysis | null>(
      null
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isAnalyzing,
    setIsAnalyzing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let cancelled = false;

    async function loadAnalysis() {
      try {
        setError(null);

        const response =
          await fetch(
            `/api/entries/${entryId}/analysis`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const responseText =
          await response.text();

        let result:
          AnalysisResponse = {};

        if (responseText) {
          try {
            result =
              JSON.parse(
                responseText
              ) as AnalysisResponse;
          } catch {
            throw new Error(
              "The server returned an invalid response."
            );
          }
        }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Unable to load AI insights."
          );
        }

        if (!cancelled) {
          setAnalysis(
            result.data ?? null
          );
        }
      } catch (error) {
        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load AI insights."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [entryId]);

  async function handleAnalyze() {
    setError(null);
    setIsAnalyzing(true);

    try {
      const response =
        await fetch(
          `/api/entries/${entryId}/analysis`,
          {
            method: "POST",
          }
        );

      const responseText =
        await response.text();

      let result:
        AnalysisResponse = {};

      if (responseText) {
        try {
          result =
            JSON.parse(
              responseText
            ) as AnalysisResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Unable to analyze this entry."
        );
      }

      if (!result.data) {
        throw new Error(
          "The AI returned no analysis."
        );
      }

      setAnalysis(
        result.data
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to analyze this entry."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm text-slate-500">
          Loading AI insights...
        </p>
      </section>
    );
  }

  const recommendations =
    getRecommendations(
      analysis?.recommendations
    );

  const narrationText =
    analysis
      ? createInsightsNarration(
          analysis,
          recommendations
        )
      : "";

  return (
    <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm sm:p-7 dark:border-violet-900/60 dark:bg-slate-950">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            AI Insights
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            AI-generated observations
            based on this diary entry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {analysis && (
            <ListenButton
              ownerId={`insights:${entryId}`}
              title="AI Insights"
              text={narrationText}
              date={analysis.updatedAt}
              source="AI Insights"
            />
          )}

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={
              isAnalyzing ||
              !allowAIProcessing
            }
            className="inline-flex cursor-pointer min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!allowAIProcessing
              ? "AI analysis disabled"
              : isAnalyzing
                ? "Analyzing..."
                : analysis
                  ? "Analyze again"
                  : "Analyze entry"}
          </button>
        </div>
      </div>

      {!allowAIProcessing && (
        <div className="mt-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900/60 dark:bg-violet-950/20">
          <p className="text-sm text-violet-800 dark:text-violet-200">
            New AI analysis is disabled
            in Settings → Privacy & AI.
            Existing saved insights remain
            available below.
          </p>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-900 bg-red-950/60 p-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {!analysis &&
        !error &&
        allowAIProcessing && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="font-medium">
            No AI analysis yet
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Analyze this entry to
            generate a summary, mood,
            topics, important events,
            action items, and
            recommendations.
          </p>
        </div>
      )}

      {analysis && (
        <div className="mt-7 space-y-7">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Summary
            </h3>

            <p className="mt-2 leading-7">
              {analysis.summary}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Mood
            </h3>

            {analysis.moodLabel ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                  {analysis.moodLabel}
                </span>

                {analysis.moodConfidence !==
                  null && (
                  <span className="text-sm text-slate-500">
                    {Math.round(
                      analysis.moodConfidence *
                        100
                    )}
                    % confidence
                  </span>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No clear dominant mood
                detected.
              </p>
            )}
          </div>

          <InsightList
            title="Topics"
            items={
              analysis.topics
            }
          />

          <InsightList
            title="Important events"
            items={
              analysis.importantEvents
            }
          />

          <InsightList
            title="Action items"
            items={
              analysis.actionItems
            }
          />

          <InsightList
            title="Recommendations"
            items={
              recommendations
            }
          />

          <p className="border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
            AI-generated insights can
            be incomplete or incorrect.
            Your diary entry remains the
            source of truth.
          </p>
        </div>
      )}
    </section>
  );
}

type InsightListProps = {
  title: string;
  items: string[];
};

function createInsightsNarration(
  analysis: AIAnalysis,
  recommendations: string[]
): string {
  const sections: string[] = [];

  sections.push(
    `Here are the AI insights for this diary entry.`
  );

  if (analysis.summary.trim()) {
    sections.push(
      `Summary. ${analysis.summary.trim()}`
    );
  }

  if (analysis.moodLabel) {
    const confidence =
      analysis.moodConfidence !== null
        ? ` with ${Math.round(
            analysis.moodConfidence * 100
          )} percent confidence`
        : "";

    sections.push(
      `Mood. The dominant mood was identified as ${analysis.moodLabel}${confidence}.`
    );
  }

  if (analysis.topics.length > 0) {
    sections.push(
      `Topics. ${formatNarrationList(
        analysis.topics
      )}.`
    );
  }

  if (
    analysis.importantEvents.length > 0
  ) {
    sections.push(
      `Important events. ${formatNarrationList(
        analysis.importantEvents
      )}.`
    );
  }

  if (analysis.actionItems.length > 0) {
    sections.push(
      `Action items. ${formatNarrationList(
        analysis.actionItems
      )}.`
    );
  }

  if (recommendations.length > 0) {
    sections.push(
      `Recommendations. ${formatNarrationList(
        recommendations
      )}.`
    );
  }

  return sections.join("\n\n");
}

function formatNarrationList(
  items: string[]
): string {
  return items
    .map(
      (item, index) =>
        `${index + 1}. ${item.trim()}`
    )
    .join(" ");
}

function InsightList({
  title,
  items,
}: InsightListProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map(
            (item, index) => (
              <li
                key={`${title}-${index}`}
                className="flex gap-3 leading-6"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500"
                />

                <span>
                  {item}
                </span>
              </li>
            )
          )}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          None identified.
        </p>
      )}
    </div>
  );
}