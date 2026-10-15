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
  googleBackupVerifyRequestSchema,
} from "@/domain/backup/google-backup-request.schema";

import {
  encryptedBackupSchema,
} from "@/domain/backup/encrypted-backup.schema";

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
   * 1. Validate the request.
   */
  let passphrase: string;

  try {
    const body =
      await request.json();

    const parsed =
      googleBackupVerifyRequestSchema.parse(
        body
      );

    passphrase =
      parsed.passphrase;
  } catch (error) {
    console.error(
      "Invalid Google Drive backup verification request:",
      error
    );

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
   * from the current backup generation.
   */
  let storedBackup;

  try {
    storedBackup =
      await downloadLatestEncryptedBackupFromGoogleDrive(
        userId
      );
  } catch (error) {
    console.error(
      "Google Drive backup download failed:",
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
   * 3. Parse the encrypted backup file.
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
  } catch (error) {
    console.error(
      "Google Drive backup JSON parsing failed:",
      error
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
   * 4. Validate the encrypted envelope,
   * authenticate AES-GCM, decrypt it,
   * and validate the plaintext backup.
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
    /*
     * Deliberately do not expose or log
     * the underlying cryptographic error.
     *
     * Wrong passphrase, corrupted ciphertext,
     * modified authentication tag and malformed
     * encrypted data all receive the same
     * client-visible response.
     */
    console.warn(
      "Google Drive backup cryptographic verification failed."
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
   * 5. Build a read-only preview.
   */
  const textEntryCount =
    backup.entries.filter(
      (entry) =>
        entry.source ===
        "TEXT"
    ).length;

  const voiceEntryCount =
    backup.entries.filter(
      (entry) =>
        entry.source ===
        "VOICE"
    ).length;

  const analysisCount =
    backup.entries.filter(
      (entry) =>
        entry.aiAnalysis !==
        null
    ).length;

  return NextResponse.json({
    data: {
      valid:
        true,

      filename:
        storedBackup.filename,

      generation:
        storedBackup.generation,

      version:
        backup.version,

      exportedAt:
        backup.exportedAt,

      account: {
        firstName:
          backup.account.firstName,

        lastName:
          backup.account.lastName,

        email:
          backup.account.email,
      },

      entryCount:
        backup.entries.length,

      textEntryCount,

      voiceEntryCount,

      analysisCount,
    },
  });
}