import {
  z,
} from "zod";

import {
  backupPassphraseSchema,
} from "@/domain/backup/encrypted-backup.schema";

export const googleBackupVerifyRequestSchema =
  z.object({
    passphrase:
      backupPassphraseSchema,
  });

export type GoogleBackupVerifyRequest =
  z.infer<
    typeof googleBackupVerifyRequestSchema
  >;