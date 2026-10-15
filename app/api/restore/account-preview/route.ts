
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
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
  encryptedBackupSchema,
} from "@/domain/backup/encrypted-backup.schema";
import {
  diaryBackupV2Schema,
} from "@/domain/backup/diary-backup.schema";
import {
  decryptDiaryBackup,
} from "@/lib/backup/backup-crypto";
import {
  verifyPortableAccountBackup,
} from "@/services/portable-account-restore.service";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_PASSWORD_ATTEMPTS = 5;

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("preview"),
    passphrase: z.string().min(12).max(1024),
  }),
  z.object({
    action: z.literal("verify-password"),
    passphrase: z.string().min(12).max(1024),
    accountPassword: z.string().min(1).max(1024),
  }),
]);

function respond(data: object, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: NextRequest) {
  if (
    request.headers.get("origin") !== request.nextUrl.origin
  ) {
    return respond({ error: "Invalid request origin." }, 403);
  }

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return respond({ error: "Invalid recovery details." }, 400);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(PORTABLE_RESTORE_COOKIE)?.value;

  const session = token
    ? await getPortableRestoreSession(token)
    : null;

  if (
    !session?.googleVerifiedAt ||
    !session.backupVerifiedAt ||
    !session.emailVerifiedAt ||
    !session.googleFileId ||
    !session.backupDigest ||
    !session.recoveryEmail ||
    !session.encryptedGoogleAccessToken
  ) {
    return respond(
      { error: "Complete Google, backup, and email verification first." },
      401
    );
  }

  if (
    parsed.data.action === "verify-password" &&
    session.accountPasswordAttempts >= MAX_PASSWORD_ATTEMPTS
  ) {
    return respond(
      { error: "Password attempt limit reached. Start a new restore session." },
      429
    );
  }

  try {
    const accessToken = decryptGoogleRestoreToken(
      session.encryptedGoogleAccessToken
    );

    const oauth = createGoogleRestoreOAuthClient();
    oauth.setCredentials({ access_token: accessToken });

    const drive = google.drive({
      version: "v3",
      auth: oauth,
    });

    const metadata = await drive.files.get({
      fileId: session.googleFileId,
      fields: "id,size,trashed,appProperties",
    });

    const file = metadata.data;

    if (
      file.trashed ||
      file.appProperties?.diaryAi !== "true" ||
      file.appProperties?.backupVersion !== "2" ||
      !file.size ||
      !/^\d+$/.test(file.size) ||
      Number(file.size) <= 0 ||
      Number(file.size) > MAX_BYTES
    ) {
      return respond(
        { error: "The selected backup is unavailable or unsupported." },
        400
      );
    }

    const download = await drive.files.get(
      {
        fileId: session.googleFileId,
        alt: "media",
      },
      { responseType: "arraybuffer" }
    );

    const bytes = Buffer.from(download.data as ArrayBuffer);

    if (
      bytes.length === 0 ||
      bytes.length > MAX_BYTES ||
      bytes.length !== Number(file.size)
    ) {
      return respond(
        { error: "Invalid backup file size." },
        400
      );
    }

    const actualDigest = createHash("sha256")
      .update(bytes)
      .digest();

    const expectedDigest = Buffer.from(
      session.backupDigest,
      "hex"
    );

    if (
      expectedDigest.length !== actualDigest.length ||
      !timingSafeEqual(actualDigest, expectedDigest)
    ) {
      return respond(
        { error: "The backup changed after verification. Start again." },
        409
      );
    }

    const envelope = encryptedBackupSchema.parse(
      JSON.parse(bytes.toString("utf8")) as unknown
    );

    const decrypted = await decryptDiaryBackup(
      envelope,
      parsed.data.passphrase
    );

    const backup = diaryBackupV2Schema.parse(decrypted);

    if (
      backup.account.email.toLowerCase() !==
      session.recoveryEmail.toLowerCase()
    ) {
      return respond(
        { error: "The backup account does not match the verified email." },
        409
      );
    }

    const preview = {
      firstName: backup.account.firstName,
      lastName: backup.account.lastName,
      email: backup.account.email,
      createdAt: backup.account.createdAt,
      exportedAt: backup.exportedAt,
      entryCount: backup.entries.length,
      analysisCount: backup.entries.filter(
        (entry) => entry.aiAnalysis !== null
      ).length,
    };

    if (parsed.data.action === "preview") {
      return respond({
        success: true,
        preview,
      });
    }

    // Reserve a password attempt before bcrypt comparison.
    const reserved =
      await prisma.portableRestoreSession.updateMany({
        where: {
          id: session.id,
          completedAt: null,
          emailVerifiedAt: { not: null },
          expiresAt: { gt: new Date() },
          accountPasswordAttempts: {
            lt: MAX_PASSWORD_ATTEMPTS,
          },
        },
        data: {
          accountPasswordAttempts: { increment: 1 },
        },
      });

    if (reserved.count !== 1) {
      return respond(
        { error: "Password attempt limit reached or session expired." },
        429
      );
    }

    try {
      const result = await verifyPortableAccountBackup(
        backup,
        parsed.data.accountPassword
      );

      // No password or decrypted journal is persisted here.
      return respond({
        success: true,
        passwordVerified: true,
        preview: result.preview,
        message:
          "The account password saved in this backup is correct.",
      });
    } catch {
      return respond(
        { error: "The account password does not match this backup." },
        401
      );
    }
  } catch (error) {
    console.error(
      "Portable account preview failed:",
      error instanceof Error ? error.name : "UnknownError"
    );

    return respond(
      {
        error:
          "Unable to read the selected backup. Check the passphrase, Google authorization, and session expiry.",
      },
      400
    );
  }
}
