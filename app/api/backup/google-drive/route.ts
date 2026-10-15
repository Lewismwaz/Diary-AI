import {
  NextResponse,
} from "next/server";

import {
  ZodError,
} from "zod";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  encryptDiaryBackup,
} from "@/lib/backup/backup-crypto";

import {
  encryptedBackupRequestSchema,
} from "@/domain/backup/backup-request.schema";

import {
  createDiaryBackup,
} from "@/services/diary-backup.service";

import {
  GoogleDriveNotConnectedError,
  GoogleDriveUploadError,
  uploadEncryptedBackupToGoogleDrive,
} from "@/services/google-drive-backup.service";

export const runtime =
  "nodejs";

function createBackupFilename(): string {
  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        "-"
      );

  return `diary-ai-backup-${timestamp}.diarybackup`;
}

export async function POST(
  request: Request
) {
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

  try {
    const body =
      await request.json();

    const {
      passphrase,
    } =
      encryptedBackupRequestSchema.parse(
        body
      );

    /*
     * Build the same portable domain-level
     * backup used by local export.
     */
    const backup =
      await createDiaryBackup(
        userId
      );

    /*
     * Encryption happens before anything
     * is handed to the Google Drive layer.
     */
    const encryptedBackup =
      await encryptDiaryBackup(
        backup,
        passphrase
      );

    const serializedBackup =
      JSON.stringify(
        encryptedBackup
      );

    const backupBuffer =
      Buffer.from(
        serializedBackup,
        "utf8"
      );

    const filename =
      createBackupFilename();

    const result =
      await uploadEncryptedBackupToGoogleDrive({
        userId,
        filename,
        backup:
          backupBuffer,
      });

    return NextResponse.json({
      data: {
        filename:
          result.filename,

        sizeBytes:
          result.sizeBytes,

        generation:
          result.generation,

        lastBackupAt:
          result.lastBackupAt.toISOString(),
      },
    });
  } catch (error) {
    console.error(
      "Google Drive backup failed:",
      error
    );

    if (
      error instanceof ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid backup passphrase.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      error instanceof
      GoogleDriveNotConnectedError
    ) {
      return NextResponse.json(
        {
          error:
            "Connect Google Drive before creating a Drive backup.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      error instanceof
      GoogleDriveUploadError
    ) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 502,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to create the Google Drive backup.",
      },
      {
        status: 500,
      }
    );
  }
}