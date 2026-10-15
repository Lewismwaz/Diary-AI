import {
  type DiaryTrendsResult,
  type TrendPeriod,
} from "@/domain/ai/diary-trends.schema";

import {
  diaryTrendsRepository,
} from "@/repositories/diary-trends.repository";

const PERIOD_DAYS: Record<
  TrendPeriod,
  number
> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function normalizeLabel(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function incrementCount(
  counts: Map<
    string,
    number
  >,
  value: string
) {
  const normalized =
    normalizeLabel(value);

  if (!normalized) {
    return;
  }

  counts.set(
    normalized,
    (counts.get(
      normalized
    ) ?? 0) + 1
  );
}

function toSortedCounts(
  counts: Map<
    string,
    number
  >
) {
  return Array.from(
    counts.entries()
  )
    .map(
      ([
        label,
        count,
      ]) => ({
        label,
        count,
      })
    )
    .sort(
      (a, b) =>
        b.count -
          a.count ||
        a.label.localeCompare(
          b.label
        )
    );
}

function getStartDate(
  period: TrendPeriod
) {
  const days =
    PERIOD_DAYS[period];

  const startDate =
    new Date();

  startDate.setHours(
    0,
    0,
    0,
    0
  );

  startDate.setDate(
    startDate.getDate() -
      (days - 1)
  );

  return startDate;
}

export class DiaryTrendsService {
  async getTrends(
    userId: string,
    period: TrendPeriod
  ): Promise<DiaryTrendsResult> {
    const startDate =
      getStartDate(period);

    const entries =
      await diaryTrendsRepository
        .listForPeriod(
          userId,
          startDate
        );

    const topicCounts =
      new Map<
        string,
        number
      >();

    const moodCounts =
      new Map<
        string,
        number
      >();

    const actionItemCounts =
      new Map<
        string,
        number
      >();

    let analyzedEntries = 0;

    for (
      const entry of entries
    ) {
      const analysis =
        entry.aiAnalysis;

      if (!analysis) {
        continue;
      }

      analyzedEntries += 1;

      for (
        const topic of
        analysis.topics
      ) {
        incrementCount(
          topicCounts,
          topic
        );
      }

      if (
        analysis.moodLabel
      ) {
        incrementCount(
          moodCounts,
          analysis.moodLabel
        );
      }

      for (
        const actionItem of
        analysis.actionItems
      ) {
        incrementCount(
          actionItemCounts,
          actionItem
        );
      }
    }

    const totalEntries =
      entries.length;

    return {
      period,

      totalEntries,

      analyzedEntries,

      analysisCoverage:
        totalEntries === 0
          ? 0
          : analyzedEntries /
            totalEntries,

      topics:
        toSortedCounts(
          topicCounts
        ),

      moods:
        toSortedCounts(
          moodCounts
        ),

      actionItems:
        toSortedCounts(
          actionItemCounts
        ),
    };
  }

  async getTrendSourceData(
    userId: string,
    period: TrendPeriod
  ) {
    const startDate =
      getStartDate(period);

    return diaryTrendsRepository
      .listForPeriod(
        userId,
        startDate
      );
  }
}

export const diaryTrendsService =
  new DiaryTrendsService();