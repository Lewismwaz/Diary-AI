import { createHash, timingSafeEqual } from "node:crypto";
import { google } from "googleapis";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createGoogleRestoreOAuthClient } from "@/lib/google/google-restore-oauth";
import { decryptGoogleRestoreToken } from "@/lib/google/google-restore-token-crypto";
import { encryptedBackupSchema } from "@/domain/backup/encrypted-backup.schema";
import { diaryBackupV2Schema } from "@/domain/backup/diary-backup.schema";
import { decryptDiaryBackup } from "@/lib/backup/backup-crypto";
import { verifyPortableAccountBackup } from "@/services/portable-account-restore.service";
import type { PortableRestoreSession } from "@/generated/prisma/client";

export class PortableRestoreFailure extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function jsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) return Prisma.JsonNull;
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new PortableRestoreFailure("Invalid analysis data.");
  return JSON.parse(serialized) as Prisma.InputJsonValue;
}

export async function completePortableRestore(
  session: PortableRestoreSession,
  passphrase: string,
  accountPassword: string
) {
  if (!session.googleVerifiedAt || !session.backupVerifiedAt || !session.emailVerifiedAt ||
      !session.googleFileId || !session.backupDigest || !session.recoveryEmail ||
      !session.encryptedGoogleAccessToken || session.completedAt || session.expiresAt <= new Date()) {
    throw new PortableRestoreFailure("Recovery verification has expired. Start again.", 401);
  }
  const accessToken = decryptGoogleRestoreToken(session.encryptedGoogleAccessToken);
  const oauth = createGoogleRestoreOAuthClient();
  oauth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: oauth });
  const metadata = await drive.files.get({
    fileId: session.googleFileId,
    fields: "id,size,trashed,appProperties",
  });
  const info = metadata.data;
  const size = Number(info.size);
  if (info.trashed || info.appProperties?.diaryAi !== "true" ||
      info.appProperties?.backupVersion !== "2" || !info.size ||
      !Number.isSafeInteger(size) || size < 1 || size > 20 * 1024 * 1024) {
    throw new PortableRestoreFailure("Selected backup is invalid or unavailable.");
  }
  const download = await drive.files.get(
    { fileId: session.googleFileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  const bytes = Buffer.from(download.data as ArrayBuffer);
  if (bytes.length !== size) throw new PortableRestoreFailure("Backup size changed.", 409);
  const actual = createHash("sha256").update(bytes).digest();
  const expected = Buffer.from(session.backupDigest, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new PortableRestoreFailure("Backup changed after verification.", 409);
  }
  const envelope = encryptedBackupSchema.parse(JSON.parse(bytes.toString("utf8")) as unknown);
  const decrypted = await decryptDiaryBackup(envelope, passphrase);
  const backup = diaryBackupV2Schema.parse(decrypted);
  const email = backup.account.email.trim().toLowerCase();
  if (email !== session.recoveryEmail.trim().toLowerCase()) {
    throw new PortableRestoreFailure("Verified email does not match backup.", 409);
  }
  // Reserve a password attempt atomically BEFORE the expensive bcrypt comparison.
  const reserved = await prisma.portableRestoreSession.updateMany({
    where: { id: session.id, completedAt: null, expiresAt: { gt: new Date() },
      emailVerifiedAt: { not: null }, accountPasswordAttempts: { lt: 5 } },
    data: { accountPasswordAttempts: { increment: 1 } },
  });
  if (reserved.count !== 1) throw new PortableRestoreFailure("Restore session expired or password attempt limit reached.", 429);
  let verified;
  try { verified = await verifyPortableAccountBackup(backup, accountPassword); }
  catch { throw new PortableRestoreFailure("Incorrect backup-era account password.", 401); }
  const snapshot = verified.backup;
  const result = await prisma.$transaction(async (tx) => {
    // Lock the restore session to prevent concurrent restoration.
    const locked = await tx.$queryRaw<
      Array<{
        id: string;
        completedAt: Date | null;
        expiresAt: Date;
      }>
    >`
      SELECT "id", "completedAt", "expiresAt"
      FROM "PortableRestoreSession"
      WHERE "id" = ${session.id}
      FOR UPDATE
    `;

    if (locked.length === 0) {
      throw new PortableRestoreFailure(
        "Restore session not found. Please restart recovery.",
        404
      );
    }

    const currentSession = locked[0];

    if (currentSession.completedAt) {
      throw new PortableRestoreFailure(
        "This restore session has already completed.",
        409
      );
    }

    if (currentSession.expiresAt <= new Date()) {
      throw new PortableRestoreFailure(
        "Your restore session has expired. Please restart recovery.",
        401
      );
    }
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) throw new PortableRestoreFailure("An account with this email already exists on this device. No data was changed.", 409);
    const user = await tx.user.create({
      data: { email, firstName: snapshot.account.firstName, lastName: snapshot.account.lastName,
        passwordHash: snapshot.account.passwordHash, createdAt: new Date(snapshot.account.createdAt) },
    });
    await tx.privacySettings.create({ data: { userId: user.id, ...snapshot.privacy } });
    for (const entry of snapshot.entries) {
      await tx.diaryEntry.create({ data: {
        id: entry.id, userId: user.id, title: entry.title,
        originalTranscript: entry.originalTranscript, cleanedContent: entry.cleanedContent,
        entryDate: new Date(entry.entryDate), source: entry.source,
        createdAt: new Date(entry.createdAt), updatedAt: new Date(entry.updatedAt),
      } });
      if (entry.aiAnalysis) {
        const a = entry.aiAnalysis;
        await tx.aIAnalysis.create({ data: {
          id: a.id, diaryEntryId: entry.id, summary: a.summary,
          moodLabel: a.moodLabel, moodConfidence: a.moodConfidence,
          topics: a.topics, importantEvents: a.importantEvents,
          actionItems: a.actionItems, recommendations: jsonValue(a.recommendations),
          model: a.model, promptVersion: a.promptVersion,
          createdAt: new Date(a.createdAt), updatedAt: new Date(a.updatedAt),
        } });
      }
    }
    await tx.portableRestoreSession.update({ where: { id: session.id },
      data: { completedAt: new Date(), encryptedGoogleAccessToken: null,
        otpHash: null, googleFileId: null, backupDigest: null } });
    return { userId: user.id, entryCount: snapshot.entries.length };
  }, { maxWait: 10000, timeout: 60000 });
  return result;
}
