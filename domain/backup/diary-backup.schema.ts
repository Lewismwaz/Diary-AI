import {
  z,
} from "zod";

export const DIARY_BACKUP_VERSION = 2 as const;

const backupDateSchema =
  z.string().datetime();

const entrySourceSchema =
  z.enum([
    "TEXT",
    "VOICE",
  ]);

const backupAnalysisSchema =
  z.object({
    id: z.string().uuid(),

    summary: z.string(),

    moodLabel:
      z.string().nullable(),

    moodConfidence:
      z.number().nullable(),

    topics:
      z.array(z.string()),

    importantEvents:
      z.array(z.string()),

    actionItems:
      z.array(z.string()),

    recommendations:
      z.unknown().nullable(),

    model:
      z.string().nullable(),

    promptVersion:
      z.string().nullable(),

    createdAt:
      backupDateSchema,

    updatedAt:
      backupDateSchema,
  });

const backupEntrySchema =
  z.object({
    id: z.string().uuid(),

    title: z.string(),

    originalTranscript:
      z.string().nullable(),

    cleanedContent:
      z.string(),

    entryDate:
      backupDateSchema,

    source:
      entrySourceSchema,

    createdAt:
      backupDateSchema,

    updatedAt:
      backupDateSchema,

    aiAnalysis:
      backupAnalysisSchema
        .nullable(),
  });

const backupPrivacySettingsSchema =
  z.object({
    allowVoiceTranscription:
      z.boolean(),

    allowAIProcessing:
      z.boolean(),

    allowAITrendAnalysis:
      z.boolean(),
  });


const backupBaseSchema = z.object({
  format: z.literal("diary-ai-backup"),

  exportedAt: backupDateSchema,

  privacy: backupPrivacySettingsSchema,

  entries: z.array(backupEntrySchema),
});

/*
 * Version 1: Existing backups.
 * These do not contain account creation dates
 * or password hashes.
 */
export const diaryBackupV1Schema =
  backupBaseSchema.extend({
    version: z.literal(1),

    account: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
    }),
  });

/*
 * Version 2: Portable account and journal backups.
 *
 * The password hash must only appear inside
 * the encrypted backup payload.
 */
export const diaryBackupV2Schema =
  backupBaseSchema.extend({
    version: z.literal(2),

    account: z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      createdAt: backupDateSchema,
      passwordHash: z.string().min(1),
    }),
  });

/*
 * Accept both historical and current backups.
 */
export const diaryBackupSchema =
  z.discriminatedUnion("version", [
    diaryBackupV1Schema,
    diaryBackupV2Schema,
  ]);

export type DiaryBackup =
  z.infer<typeof diaryBackupSchema>;

export type DiaryBackupV2 =
  z.infer<typeof diaryBackupV2Schema>;
