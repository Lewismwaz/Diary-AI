import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  decryptDiaryBackup,
} from "@/lib/backup/backup-crypto";

import {
  encryptedBackupSchema,
} from "@/domain/backup/encrypted-backup.schema";

import {
  googleDriveRestoreRequestSchema,
} from "@/domain/backup/restore-plan.schema";

import {
  restoreDiaryBackup,
} from "@/services/diary-restore.service";

import {
  GoogleDriveBackupNotFoundError,
  GoogleDriveNotConnectedError,
  downloadLatestEncryptedBackupFromGoogleDrive,
} from "@/services/google-drive-backup.service";

export const runtime =
  "nodejs";

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

  /*
   * 1. Validate the destructive request.
   */
  let passphrase: string;

  try {
    const body =
      await request.json();

    const parsed =
      googleDriveRestoreRequestSchema.parse(
        body
      );

    passphrase =
      parsed.passphrase;
  } catch {
    return NextResponse.json(
      {
        error:
          'Enter your backup passphrase and type "RESTORE JOURNAL" to confirm.',
      },
      {
        status: 400,
      }
    );
  }

  /*
   * 2. Download the latest tracked backup again.
   *
   * We intentionally do NOT trust the earlier
   * browser preview.
   */
  let storedBackup;

  try {
    storedBackup =
      await downloadLatestEncryptedBackupFromGoogleDrive(
        userId
      );
  } catch (error) {
    console.error(
      "Restore could not download Google Drive backup:",
      error
    );

    if (
      error instanceof
      GoogleDriveNotConnectedError
    ) {
      return NextResponse.json(
        {
          error:
            "Google Drive is not connected.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      error instanceof
      GoogleDriveBackupNotFoundError
    ) {
      return NextResponse.json(
        {
          error:
            "No Google Drive backup exists for the current backup generation.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to download the latest Google Drive backup.",
      },
      {
        status: 502,
      }
    );
  }

  /*
   * 3. Parse the encrypted artifact.
   */
  let encryptedBackup:
    unknown;

  try {
    encryptedBackup =
      JSON.parse(
        storedBackup.backup.toString(
          "utf8"
        )
      );
  } catch {
    return NextResponse.json(
      {
        error:
          "The Google Drive backup is not a valid Diary AI encrypted backup.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * 4. Independently authenticate,
   * decrypt and validate it.
   */
  let backup;

  try {
    const validatedEncryptedBackup =
      encryptedBackupSchema.parse(
        encryptedBackup
      );

    backup =
      await decryptDiaryBackup(
        validatedEncryptedBackup,
        passphrase
      );
  } catch {
    console.warn(
      "Google Drive restore cryptographic verification failed."
    );

    return NextResponse.json(
      {
        error:
          "Unable to decrypt or verify the latest Google Drive backup. Check your backup passphrase.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * 5. Perform the atomic database replacement.
   */
  try {
    const result =
      await restoreDiaryBackup({
        userId,
        backup,
      });

    return NextResponse.json({
      data: {
        restored:
          true,

        filename:
          storedBackup.filename,

        generation:
          storedBackup.generation,

        entryCount:
          result.entryCount,

        analysisCount:
          result.analysisCount,
      },
    });
  } catch (error) {
    console.error(
      "Transactional journal restore failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The restore could not be completed. Your existing journal was left unchanged.",
      },
      {
        status: 500,
      }
    );
  }
}