import {
  Prisma,
} from "@/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

import {
  diaryBackupSchema,
} from "@/domain/backup/diary-backup.schema";

import {
  restorePlanSchema,
  type RestorePlan,
} from "@/domain/backup/restore-plan.schema";

type CreateRestorePlanInput = {
  userId: string;
  filename: string;
  generation: number;
  backup: unknown;
};

export async function createRestorePlan({
  userId,
  filename,
  generation,
  backup: rawBackup,
}: CreateRestorePlanInput): Promise<RestorePlan> {
  /*
   * Never trust decrypted JSON merely because
   * decryption succeeded.
   *
   * Revalidate the portable backup contract
   * before planning any restore.
   */
  const backup =
    diaryBackupSchema.parse(
      rawBackup
    );

  /*
   * Read the current account independently.
   *
   * The authenticated userId is authoritative.
   * The backup cannot choose which Diary AI
   * account receives the restoration.
   */
  const currentUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

  if (!currentUser) {
    throw new Error(
      "Authenticated account was not found."
    );
  }

  /*
   * Count the current journal directly.
   *
   * Do not use the normal repository list method
   * because that intentionally limits journal
   * retrieval for normal application screens.
   */
  const [
    currentEntryCount,
    currentAnalysisCount,
  ] =
    await Promise.all([
      prisma.diaryEntry.count({
        where: {
          userId,
        },
      }),

      prisma.aIAnalysis.count({
        where: {
          diaryEntry: {
            userId,
          },
        },
      }),
    ]);

  const backupTextEntryCount =
    backup.entries.filter(
      (entry) =>
        entry.source ===
        "TEXT"
    ).length;

  const backupVoiceEntryCount =
    backup.entries.filter(
      (entry) =>
        entry.source ===
        "VOICE"
    ).length;

  const backupAnalysisCount =
    backup.entries.filter(
      (entry) =>
        entry.aiAnalysis !==
        null
    ).length;

  /*
   * Email is a consistency check only.
   *
   * It does NOT determine the destination user.
   */
  const emailMatches =
    backup.account.email
      .trim()
      .toLowerCase() ===
    currentUser.email
      .trim()
      .toLowerCase();

  const plan =
    restorePlanSchema.parse({
      mode:
        "REPLACE",

      backup: {
        filename,

        generation,

        version:
          backup.version,

        exportedAt:
          backup.exportedAt,

        entryCount:
          backup.entries.length,

        textEntryCount:
          backupTextEntryCount,

        voiceEntryCount:
          backupVoiceEntryCount,

        analysisCount:
          backupAnalysisCount,
      },

      current: {
        entryCount:
          currentEntryCount,

        analysisCount:
          currentAnalysisCount,
      },

      account: {
        backupEmail:
          backup.account.email,

        currentEmail:
          currentUser.email,

        emailMatches,

        backupFirstName:
          backup.account.firstName,

        backupLastName:
          backup.account.lastName,

        currentFirstName:
          currentUser.firstName,

        currentLastName:
          currentUser.lastName,
      },

      willRestore: [
        "Journal entries",
        "Original voice transcripts",
        "Saved AI analyses",
        "Privacy & AI preferences",
        "Safe profile metadata",
      ],

      willPreserve: [
        "Diary AI login password",
        "Authentication and session data",
        "Google Drive connection",
        "Google Drive backup history",
        "Backup generation",
        "Server secrets and API credentials",
      ],

      destructive:
        true,
    });

  return plan;
}

type RestoreDiaryBackupInput = {
  userId: string;
  backup: unknown;
};

export type RestoreDiaryBackupResult = {
  entryCount: number;
  analysisCount: number;
};

function toPrismaJsonInput(
  value: unknown
):
  | Prisma.InputJsonValue
  | typeof Prisma.JsonNull {
  /*
   * The backup schema has already validated the
   * outer backup structure.
   *
   * Prisma distinguishes a database JSON null
   * from JavaScript null when writing Json fields.
   */
  if (value === null) {
    return Prisma.JsonNull;
  }

  /*
   * JSON.stringify rejects unsupported top-level
   * values such as undefined by returning
   * undefined. JSON.parse then gives us a value
   * guaranteed to have normal JSON semantics.
   */
  const serialized =
    JSON.stringify(value);

  if (
    serialized === undefined
  ) {
    throw new Error(
      "Backup contains an invalid AI recommendation value."
    );
  }

  return JSON.parse(
    serialized
  ) as Prisma.InputJsonValue;
}

export async function restoreDiaryBackup({
  userId,
  backup: rawBackup,
}: RestoreDiaryBackupInput): Promise<RestoreDiaryBackupResult> {
  /*
   * Validate again immediately before the
   * destructive operation.
   */
  const backup =
    diaryBackupSchema.parse(
      rawBackup
    );

  const currentUser =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
      },
    });

  if (!currentUser) {
    throw new Error(
      "Authenticated account was not found."
    );
  }

  const analysisCount =
    backup.entries.filter(
      (entry) =>
        entry.aiAnalysis !==
        null
    ).length;

  /*
   * Everything below executes as one database
   * transaction.
   *
   * If any create/update/delete fails, Prisma
   * rolls the entire journal restoration back.
   */
  await prisma.$transaction(
    async (tx) => {
      /*
       * Trend reports are derived from journal
       * state and become stale immediately when
       * the journal snapshot changes.
       */
      await tx.aITrendReport.deleteMany({
        where: {
          userId,
        },
      });

      /*
       * Deleting DiaryEntry also deletes its
       * AIAnalysis because the schema uses
       * onDelete: Cascade.
       */
      await tx.diaryEntry.deleteMany({
        where: {
          userId,
        },
      });

      /*
       * Restore the snapshot one entry at a time.
       *
       * We deliberately preserve the original
       * DiaryEntry IDs. This keeps the portable
       * backup internally stable.
       */
      for (
        const entry of
        backup.entries
      ) {
        await tx.diaryEntry.create({
          data: {
            id:
              entry.id,

            userId,

            title:
              entry.title,

            originalTranscript:
              entry.originalTranscript,

            cleanedContent:
              entry.cleanedContent,

            entryDate:
              new Date(
                entry.entryDate
              ),

            source:
              entry.source,

            createdAt:
              new Date(
                entry.createdAt
              ),

            updatedAt:
              new Date(
                entry.updatedAt
              ),
          },
        });

        if (
          entry.aiAnalysis
        ) {
          const analysis =
            entry.aiAnalysis;

          await tx.aIAnalysis.create({
            data: {
              id:
                analysis.id,

              diaryEntryId:
                entry.id,

              summary:
                analysis.summary,

              moodLabel:
                analysis.moodLabel,

              moodConfidence:
                analysis.moodConfidence,

              topics:
                analysis.topics,

              importantEvents:
                analysis.importantEvents,

              actionItems:
                analysis.actionItems,

              recommendations:
                toPrismaJsonInput(
                  analysis.recommendations
                ),

              model:
                analysis.model,

              promptVersion:
                analysis.promptVersion,

              createdAt:
                new Date(
                  analysis.createdAt
                ),

              updatedAt:
                new Date(
                  analysis.updatedAt
                ),
            },
          });
        }
      }

      /*
       * Restore Privacy & AI preferences.
       *
       * These are portable account preferences,
       * unlike device-specific theme settings.
       */
      await tx.privacySettings.upsert({
        where: {
          userId,
        },

        create: {
          userId,

          allowVoiceTranscription:
            backup.privacy.allowVoiceTranscription,

          allowAIProcessing:
            backup.privacy.allowAIProcessing,

          allowAITrendAnalysis:
            backup.privacy.allowAITrendAnalysis,
        },

        update: {
          allowVoiceTranscription:
            backup.privacy.allowVoiceTranscription,

          allowAIProcessing:
            backup.privacy.allowAIProcessing,

          allowAITrendAnalysis:
            backup.privacy.allowAITrendAnalysis,
        },
      });

      /*
       * Restore only safe profile metadata.
       *
       * Do NOT restore:
       * - email
       * - passwordHash
       * - sessions/authentication
       * - Google Drive connection
       * - backup metadata
       * - secrets
       *
       * The authenticated account remains the
       * authoritative identity.
       */
      await tx.user.update({
        where: {
          id: userId,
        },

        data: {
          firstName:
            backup.account.firstName,

          lastName:
            backup.account.lastName,
        },
      });
    }
  );

  return {
    entryCount:
      backup.entries.length,

    analysisCount,
  };
}