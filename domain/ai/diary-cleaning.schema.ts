import { z } from "zod";

export const cleanDiaryRequestSchema =
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

export const cleanDiaryResultSchema =
  z.object({
    cleanedContent: z
      .string()
      .trim()
      .min(1),
  });

export type CleanDiaryResult =
  z.infer<
    typeof cleanDiaryResultSchema
  >;