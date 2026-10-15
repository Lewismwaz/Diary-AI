import { z } from "zod";

export const trendPeriodSchema =
  z.enum([
    "7d",
    "30d",
    "90d",
  ]);

export type TrendPeriod =
  z.infer<
    typeof trendPeriodSchema
  >;

export const trendCountSchema =
  z.object({
    label: z.string(),
    count: z
      .number()
      .int()
      .nonnegative(),
  });

export const diaryTrendsResultSchema =
  z.object({
    period: trendPeriodSchema,

    totalEntries: z
      .number()
      .int()
      .nonnegative(),

    analyzedEntries: z
      .number()
      .int()
      .nonnegative(),

    analysisCoverage:
      z.number()
        .min(0)
        .max(1),

    topics:
      z.array(
        trendCountSchema
      ),

    moods:
      z.array(
        trendCountSchema
      ),

    actionItems:
      z.array(
        trendCountSchema
      ),
  });

export const diaryTrendSynthesisMetaSchema =
  z.object({
    generatedAt:
      z.string(),

    cached:
      z.boolean(),
  });

export type DiaryTrendSynthesisMeta =
  z.infer<
    typeof diaryTrendSynthesisMetaSchema
  >;

export type DiaryTrendsResult =
  z.infer<
    typeof diaryTrendsResultSchema
  >;

export const diaryTrendSynthesisSchema =
  z.object({
    overview: z
      .string()
      .trim()
      .min(1)
      .max(1000),

    recurringThemes: z
      .array(
        z.object({
          theme: z
            .string()
            .trim()
            .min(1)
            .max(120),

          evidence: z
            .array(
              z.string()
                .trim()
                .min(1)
                .max(200)
            )
            .min(1)
            .max(5),
        })
      )
      .max(8),

    observedPatterns: z
      .array(
        z.string()
          .trim()
          .min(1)
          .max(300)
      )
      .max(8),

    suggestedFocusAreas: z
      .array(
        z.string()
          .trim()
          .min(1)
          .max(300)
      )
      .max(8),
  });

export type DiaryTrendSynthesis =
  z.infer<
    typeof diaryTrendSynthesisSchema
  >;

export const diaryTrendsWithSynthesisSchema =
  diaryTrendsResultSchema.extend({
    synthesis:
      diaryTrendSynthesisSchema
        .nullable(),

    synthesisMeta:
      diaryTrendSynthesisMetaSchema
        .nullable(),
  });

export type DiaryTrendsWithSynthesis =
  z.infer<
    typeof diaryTrendsWithSynthesisSchema
  >;