import {
  z,
} from "zod";

export const ENCRYPTED_BACKUP_VERSION =
  1 as const;

export const encryptedBackupSchema =
  z.object({
    format:
      z.literal(
        "diary-ai-encrypted-backup"
      ),

    version:
      z.literal(
        ENCRYPTED_BACKUP_VERSION
      ),

    encryption:
      z.object({
        algorithm:
          z.literal(
            "aes-256-gcm"
          ),

        keyDerivation:
          z.literal(
            "scrypt"
          ),

        salt:
          z.string().min(1),

        iv:
          z.string().min(1),

        authTag:
          z.string().min(1),
      }),

    ciphertext:
      z.string().min(1),
  });

export type EncryptedDiaryBackup =
  z.infer<
    typeof encryptedBackupSchema
  >;

export const backupPassphraseSchema =
  z.string()
    .min(
      12,
      "Backup passphrase must contain at least 12 characters."
    )
    .max(
      256,
      "Backup passphrase is too long."
    );