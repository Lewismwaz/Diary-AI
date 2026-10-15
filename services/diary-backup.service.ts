import {
  diaryBackupSchema,
  DIARY_BACKUP_VERSION,
  type DiaryBackup,
} from "@/domain/backup/diary-backup.schema";

import {
  prisma,
} from "@/lib/prisma";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

export class BackupAccountNotFoundError
  extends Error {
  constructor() {
    super(
      "Account not found."
    );

    this.name =
      "BackupAccountNotFoundError";
  }
}

export async function createDiaryBackup(
  userId: string
): Promise<DiaryBackup> {
  /*
   * Load only safe account
   * metadata.
   */
  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        passwordHash: true,
      },
    });

  if (!user) {
    throw new BackupAccountNotFoundError();
  }

  /*
   * Do NOT use
   * DiaryEntryRepository.listByUser()
   * here because that repository
   * currently limits results to 50.
   *
   * A backup must contain every
   * diary entry belonging to the
   * authenticated user.
   */
  const entries =
    await prisma.diaryEntry.findMany({
      where: {
        userId,
      },

      orderBy: {
        entryDate: "asc",
      },

      include: {
        aiAnalysis: true,
      },
    });

  const privacy =
    await getPrivacySettings(
      userId
    );

  const backup: DiaryBackup = {
    format:
      "diary-ai-backup",

    version:
      DIARY_BACKUP_VERSION,

    exportedAt:
      new Date().toISOString(),

    account: {
      firstName:
        user.firstName,

      lastName:
        user.lastName,

      email:
        user.email,

      createdAt: 
        user.createdAt.toISOString(),

      passwordHash: 
        user.passwordHash,
    },

    privacy,

    entries:
      entries.map(
        (entry) => ({
          id:
            entry.id,

          title:
            entry.title,

          originalTranscript:
            entry.originalTranscript,

          cleanedContent:
            entry.cleanedContent,

          entryDate:
            entry.entryDate
              .toISOString(),

          source:
            entry.source,

          createdAt:
            entry.createdAt
              .toISOString(),

          updatedAt:
            entry.updatedAt
              .toISOString(),

          aiAnalysis:
            entry.aiAnalysis
              ? {
                  id:
                    entry
                      .aiAnalysis
                      .id,

                  summary:
                    entry
                      .aiAnalysis
                      .summary,

                  moodLabel:
                    entry
                      .aiAnalysis
                      .moodLabel,

                  moodConfidence:
                    entry
                      .aiAnalysis
                      .moodConfidence,

                  topics:
                    entry
                      .aiAnalysis
                      .topics,

                  importantEvents:
                    entry
                      .aiAnalysis
                      .importantEvents,

                  actionItems:
                    entry
                      .aiAnalysis
                      .actionItems,

                  recommendations:
                    entry
                      .aiAnalysis
                      .recommendations,

                  model:
                    entry
                      .aiAnalysis
                      .model,

                  promptVersion:
                    entry
                      .aiAnalysis
                      .promptVersion,

                  createdAt:
                    entry
                      .aiAnalysis
                      .createdAt
                      .toISOString(),

                  updatedAt:
                    entry
                      .aiAnalysis
                      .updatedAt
                      .toISOString(),
                }
              : null,
        })
      ),
  };

  /*
   * Validate our own output.
   *
   * This catches accidental schema
   * drift before an invalid backup
   * ever reaches Google Drive.
   */
  return diaryBackupSchema.parse(
    backup
  );
}