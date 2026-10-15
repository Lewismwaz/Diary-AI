import {
  z,
} from "zod";

import {
  backupPassphraseSchema,
} from "@/domain/backup/encrypted-backup.schema";

export const verifyRecoveryBackupSchema =
  z.object({
    passphrase:
      backupPassphraseSchema,
  });

export type VerifyRecoveryBackupInput =
  z.infer<
    typeof verifyRecoveryBackupSchema
  >;