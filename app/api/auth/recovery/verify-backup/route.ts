import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import { auth } from "@/auth";

import {
  encryptedBackupSchema,
} from "@/domain/backup/encrypted-backup.schema";

import {
  verifyRecoveryBackupSchema,
} from "@/domain/auth/recovery.schema";

import {
  decryptDiaryBackup,
} from "@/lib/backup/backup-crypto";

import {
  ACCOUNT_RECOVERY_COOKIE,
  ACCOUNT_RECOVERY_MAX_AGE,
  getAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";

import {
  downloadLatestEncryptedBackupFromGoogleDrive,
} from "@/services/google-drive-backup.service";

import {
  prisma,
} from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_RECOVERY_BACKUP_BYTES =
  25 * 1024 * 1024;

function errorResponse(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    }
  );
}

export async function POST(
  request: Request
) {
  /*
   * This endpoint belongs to the
   * unauthenticated recovery flow.
   */
  const authenticatedSession =
    await auth();

  if (
    authenticatedSession?.user?.id
  ) {
    return errorResponse(
      "Account recovery is not available while signed in.",
      409
    );
  }

  const cookieStore =
    await cookies();

  const recoveryToken =
    cookieStore.get(
      ACCOUNT_RECOVERY_COOKIE
    )?.value;

  if (!recoveryToken) {
    return errorResponse(
      "Your recovery session has expired. Start account recovery again.",
      401
    );
  }

  const recoverySession =
    await getAccountRecoverySession(
      recoveryToken
    );

  if (!recoverySession) {
    return errorResponse(
      "Your recovery session has expired. Start account recovery again.",
      401
    );
  }

  /*
   * Google identity verification must have
   * occurred before backup verification.
   */
  if (
    !recoverySession.googleVerifiedAt
  ) {
    return errorResponse(
      "Google account verification is required.",
      403
    );
  }

  /*
   * Make the operation idempotent.
   *
   * If this stage was already completed,
   * don't download/decrypt the backup again.
   */
  if (
    recoverySession.backupVerifiedAt
  ) {
    return NextResponse.json({
      data: {
        verified: true,
      },
    });
  }

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return errorResponse(
      "Invalid request.",
      400
    );
  }

  const parsedRequest =
    verifyRecoveryBackupSchema.safeParse(
      body
    );

  if (!parsedRequest.success) {
    return errorResponse(
      parsedRequest.error.issues[0]
        ?.message ??
        "Invalid backup passphrase.",
      400
    );
  }

  const {
    passphrase,
  } = parsedRequest.data;

  try {
    /*
     * This existing service deliberately
     * downloads only the latest tracked
     * backup in the connection's current
     * backup generation.
     */
    const latestBackup =
      await downloadLatestEncryptedBackupFromGoogleDrive(
        recoverySession.userId
      );

    /*
     * Defensive size check before parsing
     * potentially attacker-controlled data.
     */
    if (
      latestBackup.backup.byteLength >
      MAX_RECOVERY_BACKUP_BYTES
    ) {
      return errorResponse(
        "The recovery backup is too large.",
        400
      );
    }

    let serializedEnvelope:
      unknown;

    try {
      serializedEnvelope =
        JSON.parse(
          latestBackup.backup.toString(
            "utf8"
          )
        );
    } catch {
      return errorResponse(
        "The recovery backup is invalid.",
        400
      );
    }

    /*
     * Validate the outer encrypted backup
     * structure before decryption.
     */
    const envelopeResult =
      encryptedBackupSchema.safeParse(
        serializedEnvelope
      );

    if (!envelopeResult.success) {
      return errorResponse(
        "The recovery backup is invalid.",
        400
      );
    }

    /*
     * decryptDiaryBackup performs:
     *
     * 1. encrypted-envelope validation
     * 2. scrypt key derivation
     * 3. AES-256-GCM authentication
     * 4. decryption
     * 5. diaryBackupSchema validation
     *
     * We deliberately do not retain the
     * decrypted backup here. This stage only
     * proves possession of the passphrase.
     */
    await decryptDiaryBackup(
      envelopeResult.data,
      passphrase
    );

    /*
     * Record only that verification
     * succeeded. Never persist the
     * passphrase or derived key.
     */
    const updateResult =
      await prisma.accountRecoverySession.updateMany({
        where: {
          id:
            recoverySession.id,

          userId:
            recoverySession.userId,

          backupVerifiedAt:
            null,

          expiresAt: {
            gt:
              new Date(),
          },
        },

        data: {
          backupVerifiedAt:
            new Date(),

          expiresAt:
            new Date(
              Date.now() +
                ACCOUNT_RECOVERY_MAX_AGE *
                  1000
            ),
        },
      });

    if (
      updateResult.count !== 1
    ) {
      return errorResponse(
        "Your recovery session has expired. Start account recovery again.",
        401
      );
    }

    return NextResponse.json({
      data: {
        verified: true,
      },
    });
  } catch (error) {
    /*
     * Do not reveal whether failure came from:
     *
     * - wrong passphrase
     * - authentication-tag failure
     * - malformed encrypted data
     * - unavailable Drive backup
     * - Drive authorization problem
     *
     * Those distinctions aren't useful to an
     * unauthenticated caller.
     */
    console.error(
      "Recovery backup verification failed:",
      error
    );

    return errorResponse(
      "The backup could not be verified. Check your backup passphrase and try again.",
      400
    );
  }
}