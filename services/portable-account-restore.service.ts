
import bcrypt from "bcryptjs";

import {
  diaryBackupV2Schema,
  type DiaryBackupV2,
} from "@/domain/backup/diary-backup.schema";

export class InvalidPortableBackupError extends Error {
  constructor() {
    super(
      "This backup cannot be used for portable account restoration."
    );

    this.name = "InvalidPortableBackupError";
  }
}

export class InvalidBackupAccountPasswordError extends Error {
  constructor() {
    super(
      "The account password does not match this backup."
    );

    this.name = "InvalidBackupAccountPasswordError";
  }
}

export type PortableAccountPreview = {
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  exportedAt: string;
  entryCount: number;
  analysisCount: number;
};

export async function verifyPortableAccountBackup(
  rawBackup: unknown,
  accountPassword: string
): Promise<{
  backup: DiaryBackupV2;
  preview: PortableAccountPreview;
}> {
  /*
   * Accept only version 2 backups.
   *
   * Version 2 contains the account metadata
   * and password verifier required for
   * independent account restoration.
   */
  const parsed =
    diaryBackupV2Schema.safeParse(rawBackup);

  if (!parsed.success) {
    throw new InvalidPortableBackupError();
  }

  const backup = parsed.data;

  /*
   * Verify the account password against the
   * bcrypt hash recovered from the encrypted
   * backup payload.
   *
   * Never expose this hash to the browser.
   */
  const passwordMatches = await bcrypt.compare(
    accountPassword,
    backup.account.passwordHash
  );

  if (!passwordMatches) {
    throw new InvalidBackupAccountPasswordError();
  }

  const preview: PortableAccountPreview = {
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

  return {
    backup,
    preview,
  };
}
