import {
  z,
} from "zod";

import {
  backupPassphraseSchema,
} from "@/domain/backup/encrypted-backup.schema";

export const encryptedBackupRequestSchema =
  z.object({
    passphrase:
      backupPassphraseSchema,
  });

export type EncryptedBackupRequest =
  z.infer<
    typeof encryptedBackupRequestSchema
  >;