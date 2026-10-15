
import {
  createHash,
} from "node:crypto";

import {
  cookies,
} from "next/headers";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  google,
} from "googleapis";

import {
  z,
} from "zod";

import {
  prisma,
} from "@/lib/prisma";

import {
  getPortableRestoreSession,
  PORTABLE_RESTORE_COOKIE,
} from "@/lib/auth/portable-restore-session";

import {
  createGoogleRestoreOAuthClient,
} from "@/lib/google/google-restore-oauth";

import {
  decryptGoogleRestoreToken,
} from "@/lib/google/google-restore-token-crypto";

import {
  decryptDiaryBackup,
} from "@/lib/backup/backup-crypto";

import {
  encryptedBackupSchema,
} from "@/domain/backup/encrypted-backup.schema";

import {
  diaryBackupV2Schema,
} from "@/domain/backup/diary-backup.schema";

export const runtime = "nodejs";

const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const MAX_ATTEMPTS = 5;

const requestSchema = z.object({
  fileId: z.string().min(1).max(255),

  passphrase: z.string().min(12).max(1024),
});

function json(
  body: object,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(
  request: NextRequest
) {
  // Reject cross-origin submissions.
  const origin = request.headers.get("origin");

  if (
    !origin ||
    origin !== request.nextUrl.origin
  ) {
    return json(
      { error: "Invalid request origin." },
      403
    );
  }

  const cookieStore = await cookies();

  const restoreToken = cookieStore.get(
    PORTABLE_RESTORE_COOKIE
  )?.value;

  const session = restoreToken
    ? await getPortableRestoreSession(
        restoreToken
      )
    : null;

  if (
    !session ||
    !session.googleVerifiedAt ||
    !session.googleAccountId ||
    !session.encryptedGoogleAccessToken
  ) {
    return json(
      {
        error:
          "Google verification is required.",
      },
      401
    );
  }

  if (
    session.backupVerifiedAt ||
    session.googleFileId
  ) {
    return json(
      {
        error:
          "A backup has already been selected. Start a new restore session to change it.",
      },
      409
    );
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return json(
      {
        error:
          "Select a backup and enter a valid passphrase of at least 12 characters.",
      },
      400
    );
  }

  // Atomically reserve an attempt before any
  // expensive Drive or decryption operation.
  const reserved =
    await prisma.portableRestoreSession.updateMany({
      where: {
        id: session.id,
        completedAt: null,
        backupVerifiedAt: null,
        googleFileId: null,
        expiresAt: {
          gt: new Date(),
        },
        backupVerifyAttempts: {
          lt: MAX_ATTEMPTS,
        },
      },
      data: {
        backupVerifyAttempts: {
          increment: 1,
        },
      },
    });

  if (reserved.count !== 1) {
    return json(
      {
        error:
          "Backup verification is unavailable or the attempt limit has been reached. Start again.",
      },
      429
    );
  }

  const { fileId, passphrase } = parsed.data;

  try {
    const accessToken =
      decryptGoogleRestoreToken(
        session.encryptedGoogleAccessToken
      );

    const oauthClient =
      createGoogleRestoreOAuthClient();

    oauthClient.setCredentials({
      access_token: accessToken,
    });

    const drive = google.drive({
      version: "v3",
      auth: oauthClient,
    });

    // Check metadata before downloading.
    const metadata = await drive.files.get({
      fileId,
      fields:
        "id,name,size,trashed,appProperties",
    });

    const file = metadata.data;

    if (
      file.trashed ||
      file.appProperties?.diaryAi !== "true" ||
      file.appProperties?.backupVersion !== "2" ||
      !file.size ||
      !/^\d+$/.test(file.size) ||
      Number(file.size) > MAX_BACKUP_BYTES ||
      Number(file.size) <= 0
    ) {
      return json(
        {
          error:
            "The selected file is not a supported version 2 backup.",
        },
        400
      );
    }

    // Retrieve the encrypted file bytes.
    const download = await drive.files.get(
      {
        fileId,
        alt: "media",
      },
      {
        responseType: "arraybuffer",
      }
    );

    const encryptedBytes = Buffer.from(
      download.data as ArrayBuffer
    );

    if (
      encryptedBytes.length === 0 ||
      encryptedBytes.length > MAX_BACKUP_BYTES ||
      encryptedBytes.length !== Number(file.size)
    ) {
      return json(
        {
          error:
            "The backup file has an invalid size.",
        },
        400
      );
    }

    const digest = createHash("sha256")
      .update(encryptedBytes)
      .digest("hex");

    const encryptedDocument: unknown = JSON.parse(
      encryptedBytes.toString("utf8")
    );

    // Validate the encrypted backup envelope
    // before passing it to the decryption service.
    const encryptedBackup =
      encryptedBackupSchema.parse(
        encryptedDocument
      );

    const decrypted = await decryptDiaryBackup(
      encryptedBackup,
      passphrase
    );

    const backup =
      diaryBackupV2Schema.parse(decrypted);

    // The restore session belongs to the
    // verified Google identity, but the
    // backup email is verified separately
    // in the next stage.
    const updated =
      await prisma.portableRestoreSession.updateMany({
        where: {
          id: session.id,
          completedAt: null,
          backupVerifiedAt: null,
          googleFileId: null,
          expiresAt: {
            gt: new Date(),
          },
        },
        data: {
          googleFileId: fileId,
          backupDigest: digest,
          backupVerifiedAt: new Date(),

          // OTP has not yet been verified.
          recoveryEmail: backup.account.email,
          emailVerifiedAt: null,
        },
      });

    if (updated.count !== 1) {
      return json(
        {
          error:
            "The restore session changed or expired. Please start again.",
        },
        409
      );
    }

    return json({
      success: true,
      nextStep: "email-verification",
      message:
        "Backup passphrase verified successfully. Continue with email verification.",
    });
  } catch (error) {
    // Never log passphrases, encrypted
    // contents, decrypted journal data,
    // or the recovered password hash.
    console.error(
      "Portable backup verification failed:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return json(
      {
        error:
          "Unable to verify this backup. Check the passphrase, file integrity, and Google authorization.",
      },
      400
    );
  }
}
