import { z } from "zod";

import {
  backupPassphraseSchema,
} from "@/domain/backup/encrypted-backup.schema";

export const googleDriveRestorePlanRequestSchema =
  z.object({
    passphrase:
      backupPassphraseSchema,
  });

export type GoogleDriveRestorePlanRequest =
  z.infer<
    typeof googleDriveRestorePlanRequestSchema
  >;

export const restorePlanSchema =
  z.object({
    mode:
      z.literal("REPLACE"),

    backup: z.object({
      filename:
        z.string().min(1),

      generation:
        z.number().int().positive(),

      version:
        z.number().int().positive(),

      exportedAt:
        z.string().datetime(),

      entryCount:
        z.number().int().nonnegative(),

      textEntryCount:
        z.number().int().nonnegative(),

      voiceEntryCount:
        z.number().int().nonnegative(),

      analysisCount:
        z.number().int().nonnegative(),
    }),

    current: z.object({
      entryCount:
        z.number().int().nonnegative(),

      analysisCount:
        z.number().int().nonnegative(),
    }),

    account: z.object({
      backupEmail:
        z.string().email(),

      currentEmail:
        z.string().email(),

      emailMatches:
        z.boolean(),

      backupFirstName:
        z.string(),

      backupLastName:
        z.string(),

      currentFirstName:
        z.string(),

      currentLastName:
        z.string(),
    }),

    willRestore:
      z.array(z.string()),

    willPreserve:
      z.array(z.string()),

    destructive:
      z.literal(true),
  });

export type RestorePlan =
  z.infer<
    typeof restorePlanSchema
  >;

export const RESTORE_CONFIRMATION =
  "RESTORE JOURNAL" as const;

export const googleDriveRestoreRequestSchema =
  z.object({
    passphrase:
      backupPassphraseSchema,

    confirmation:
      z.literal(
        RESTORE_CONFIRMATION
      ),
  });

export type GoogleDriveRestoreRequest =
  z.infer<
    typeof googleDriveRestoreRequestSchema
  >;