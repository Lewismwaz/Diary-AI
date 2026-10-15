import { z } from "zod";

export const diaryEntryIdSchema = z.string().uuid(
  "Invalid diary entry ID."
);

export const createDiaryEntrySchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  cleanedContent: z.string().trim().min(1, "Diary content is required").max(50_000),
  originalTranscript: z.string().max(50_000).nullable().optional(),
  source: z.enum(["TEXT", "VOICE"]).default("TEXT"),
  entryDate: z.coerce.date().optional(),
});

export type CreateDiaryEntryRequest = z.infer<typeof createDiaryEntrySchema>;

export const updateDiaryEntrySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(160, "Title cannot exceed 160 characters.")
      .optional(),

    cleanedContent: z
      .string()
      .trim()
      .min(1, "Diary content is required.")
      .max(50_000, "Diary content is too long.")
      .optional(),

    originalTranscript: z
      .string()
      .max(50_000)
      .nullable()
      .optional(),

    entryDate: z.coerce.date().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one field must be provided.",
    }
  );

export type UpdateDiaryEntryRequest =
  z.infer<typeof updateDiaryEntrySchema>;