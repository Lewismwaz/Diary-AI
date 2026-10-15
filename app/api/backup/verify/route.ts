import {
  NextResponse,
} from "next/server";

import {
  backupPassphraseSchema,
  encryptedBackupSchema,
} from "@/domain/backup/encrypted-backup.schema";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  decryptDiaryBackup,
} from "@/lib/backup/backup-crypto";

export const runtime =
  "nodejs";

const MAX_BACKUP_SIZE =
  25 * 1024 * 1024;

export async function POST(
  request: Request
) {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    let formData: FormData;

    try {
      formData =
        await request.formData();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid backup verification request.",
        },
        {
          status: 400,
        }
      );
    }

    const backupFile =
      formData.get(
        "backup"
      );

    const passphraseValue =
      formData.get(
        "passphrase"
      );

    if (
      !(backupFile instanceof File)
    ) {
      return NextResponse.json(
        {
          error:
            "Select a Diary AI backup file.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      backupFile.size === 0
    ) {
      return NextResponse.json(
        {
          error:
            "The selected backup file is empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      backupFile.size >
      MAX_BACKUP_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "The selected backup file is too large.",
        },
        {
          status: 413,
        }
      );
    }

    if (
      typeof passphraseValue !==
      "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Enter your backup passphrase.",
        },
        {
          status: 400,
        }
      );
    }

    const passphraseValidation =
      backupPassphraseSchema
        .safeParse(
          passphraseValue
        );

    if (
      !passphraseValidation.success
    ) {
      return NextResponse.json(
        {
          error:
            passphraseValidation
              .error
              .issues[0]
              ?.message ??
            "Invalid backup passphrase.",
        },
        {
          status: 400,
        }
      );
    }

    let rawBackup: unknown;

    try {
      const backupText =
        await backupFile.text();

      rawBackup =
        JSON.parse(
          backupText
        );
    } catch {
      return NextResponse.json(
        {
          error:
            "The selected file is not a valid Diary AI backup.",
        },
        {
          status: 400,
        }
      );
    }

    const envelopeValidation =
      encryptedBackupSchema
        .safeParse(
          rawBackup
        );

    if (
      !envelopeValidation.success
    ) {
      return NextResponse.json(
        {
          error:
            "The selected file is not a valid Diary AI encrypted backup.",
        },
        {
          status: 400,
        }
      );
    }

    try {
      const backup =
        await decryptDiaryBackup(
          envelopeValidation.data,
          passphraseValidation.data
        );

      const voiceEntryCount =
        backup.entries.filter(
          (entry) =>
            entry.source ===
            "VOICE"
        ).length;

      const textEntryCount =
        backup.entries.length -
        voiceEntryCount;

      const analysisCount =
        backup.entries.filter(
          (entry) =>
            entry.aiAnalysis !==
            null
        ).length;

      return NextResponse.json({
        data: {
          valid: true,

          version:
            backup.version,

          exportedAt:
            backup.exportedAt,

          account: {
            firstName:
              backup.account
                .firstName,

            lastName:
              backup.account
                .lastName,

            email:
              backup.account
                .email,
          },

          entryCount:
            backup.entries.length,

          textEntryCount,

          voiceEntryCount,

          analysisCount,
        },
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "The backup passphrase is incorrect, or the backup file is damaged.",
        },
        {
          status: 400,
        }
      );
    }
  } catch (error) {
    console.error(
      "POST /api/backup/verify failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to verify the diary backup.",
      },
      {
        status: 500,
      }
    );
  }
}