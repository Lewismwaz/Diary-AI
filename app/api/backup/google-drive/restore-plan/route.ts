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
  googleDriveRestorePlanRequestSchema,
} from "@/domain/backup/restore-plan.schema";

import {
  createRestorePlan,
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
   * 1. Validate request.
   */
  let passphrase: string;

  try {
    const body =
      await request.json();

    const parsed =
      googleDriveRestorePlanRequestSchema.parse(
        body
      );

    passphrase =
      parsed.passphrase;
  } catch {
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

  /*
   * 2. Download the latest tracked backup
   * from the current generation.
   */
  let storedBackup;

  try {
    storedBackup =
      await downloadLatestEncryptedBackupFromGoogleDrive(
        userId
      );
  } catch (error) {
    console.error(
      "Restore planning could not download Google Drive backup:",
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
   * 3. Parse encrypted file.
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
          "Unable to verify the backup.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * 4. Authenticate and decrypt.
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
      "Google Drive restore-plan cryptographic verification failed."
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
   * 5. Produce the read-only restore plan.
   */
  try {
    const plan =
      await createRestorePlan({
        userId,

        filename:
          storedBackup.filename,

        generation:
          storedBackup.generation,

        backup,
      });

    return NextResponse.json({
      data:
        plan,
    });
  } catch (error) {
    console.error(
      "Unable to create restore plan:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to prepare the restore plan.",
      },
      {
        status: 500,
      }
    );
  }
}