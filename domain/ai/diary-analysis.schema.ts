import { z } from "zod";

export const analyzeDiaryRequestSchema =
  z.object({
    content: z
      .string()
      .trim()
      .min(
        1,
        "Diary content is required."
      )
      .max(
        50_000,
        "Diary content is too long."
      ),
  });

export const diaryAnalysisResultSchema =
  z.object({
    summary: z
      .string()
      .trim()
      .min(1),

    moodLabel: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .nullable(),

    moodConfidence: z
      .number()
      .min(0)
      .max(1)
      .nullable(),

    topics: z
      .array(
        z.string().trim().min(1)
      )
      .max(10),

    importantEvents: z
      .array(
        z.string().trim().min(1)
      )
      .max(10),

    actionItems: z
      .array(
        z.string().trim().min(1)
      )
      .max(10),

    recommendations: z
      .array(
        z.string().trim().min(1)
      )
      .max(10),
  });

export type DiaryAnalysisResult =
  z.infer<
    typeof diaryAnalysisResultSchema
  >;