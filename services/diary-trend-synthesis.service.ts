import type {
  DiaryTrendSynthesis,
  DiaryTrendSynthesisMeta,
  TrendPeriod,
} from "@/domain/ai/diary-trends.schema";

import {
  synthesizeDiaryTrends,
} from "@/lib/cohere";

import {
  createTrendFingerprint,
} from "@/lib/diary-trend-fingerprint";

import type {
  AITrendReportRepository,
} from "@/repositories/ai-trend-report.repository";

import {
  diaryTrendsService,
} from "@/services/diary-trends.service";

export type DiaryTrendSynthesisResult = {
  synthesis:
    DiaryTrendSynthesis | null;

  synthesisMeta:
    DiaryTrendSynthesisMeta | null;
};

export class DiaryTrendSynthesisService {
  constructor(
    private readonly reportRepository:
      AITrendReportRepository
  ) {}

  async synthesize(
    userId: string,
    period: TrendPeriod
  ): Promise<
    DiaryTrendSynthesisResult
  > {
    const entries =
      await diaryTrendsService
        .getTrendSourceData(
          userId,
          period
        );

    const analyzedEntries =
      entries.filter(
        (
          entry
        ): entry is
          typeof entry & {
            aiAnalysis:
              NonNullable<
                typeof entry.aiAnalysis
              >;
          } =>
          entry.aiAnalysis !==
          null
      );

    if (
      analyzedEntries.length <
      2
    ) {
      return {
        synthesis: null,
        synthesisMeta: null,
      };
    }

    /*
     * Create a fingerprint from
     * the analyzed entries.
     *
     * If an analysis changes,
     * its updatedAt changes,
     * producing a new fingerprint.
     */
    const fingerprint =
      createTrendFingerprint(
        userId,
        period,
        entries
      );

    /*
     * Look for a previously
     * generated report in
     * PostgreSQL.
     */
    const storedReport =
      await this.reportRepository
        .find(
          userId,
          period
        );

    /*
     * The stored synthesis is
     * still valid when its
     * fingerprint matches the
     * current source data.
     */
    if (
      storedReport &&
      storedReport.fingerprint ===
        fingerprint
    ) {
      return {
        synthesis:
          storedReport.synthesis,

        synthesisMeta: {
          generatedAt:
            storedReport
              .generatedAt
              .toISOString(),

          cached: true,
        },
      };
    }

    /*
     * No valid persisted report
     * exists.
     *
     * Prepare only structured
     * AIAnalysis data for Cohere.
     * Raw diary content is not
     * required here.
     */
    const analyses =
      analyzedEntries.map(
        (entry) => ({
          entryDate:
            entry.entryDate
              .toISOString(),

          summary:
            entry.aiAnalysis
              .summary,

          moodLabel:
            entry.aiAnalysis
              .moodLabel,

          moodConfidence:
            entry.aiAnalysis
              .moodConfidence,

          topics:
            entry.aiAnalysis
              .topics,

          importantEvents:
            entry.aiAnalysis
              .importantEvents,

          actionItems:
            entry.aiAnalysis
              .actionItems,
        })
      );

    /*
     * Generate fresh cross-entry
     * intelligence.
     */
    const synthesis =
      await synthesizeDiaryTrends({
        period,

        analyzedEntries:
          analyses.length,

        analyses,
      });

    /*
     * Persist the synthesis and
     * its fingerprint.
     */
    const savedReport =
      await this.reportRepository
        .save(
          userId,
          period,
          fingerprint,
          synthesis
        );

    return {
      synthesis:
        savedReport.synthesis,

      synthesisMeta: {
        generatedAt:
          savedReport
            .generatedAt
            .toISOString(),

        cached: false,
      },
    };
  }
}