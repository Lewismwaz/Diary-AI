import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt as scryptCallback,
} from "node:crypto";

import {
  promisify,
} from "node:util";

import {
  diaryBackupSchema,
  type DiaryBackup,
} from "@/domain/backup/diary-backup.schema";

import {
  encryptedBackupSchema,
  ENCRYPTED_BACKUP_VERSION,
  type EncryptedDiaryBackup,
} from "@/domain/backup/encrypted-backup.schema";

const scrypt =
  promisify(
    scryptCallback
  ) as (
    password:
      string | Buffer,
    salt:
      string | Buffer,
    keylen:
      number
  ) => Promise<Buffer>;

const KEY_LENGTH =
  32;

const SALT_LENGTH =
  16;

const IV_LENGTH =
  12;

const ALGORITHM =
  "aes-256-gcm";

async function deriveKey(
  passphrase: string,
  salt: Buffer
): Promise<Buffer> {
  return scrypt(
    passphrase,
    salt,
    KEY_LENGTH
  );
}

export async function encryptDiaryBackup(
  backup: DiaryBackup,
  passphrase: string
): Promise<EncryptedDiaryBackup> {
  /*
   * Validate before encryption.
   * We never intentionally encrypt
   * malformed backup data.
   */
  const validatedBackup =
    diaryBackupSchema.parse(
      backup
    );

  const salt =
    randomBytes(
      SALT_LENGTH
    );

  const iv =
    randomBytes(
      IV_LENGTH
    );

  const key =
    await deriveKey(
      passphrase,
      salt
    );

  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv
    );

  const plaintext =
    JSON.stringify(
      validatedBackup
    );

  const encrypted =
    Buffer.concat([
      cipher.update(
        plaintext,
        "utf8"
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  const encryptedBackup:
    EncryptedDiaryBackup = {
      format:
        "diary-ai-encrypted-backup",

      version:
        ENCRYPTED_BACKUP_VERSION,

      encryption: {
        algorithm:
          ALGORITHM,

        keyDerivation:
          "scrypt",

        salt:
          salt.toString(
            "base64"
          ),

        iv:
          iv.toString(
            "base64"
          ),

        authTag:
          authTag.toString(
            "base64"
          ),
      },

      ciphertext:
        encrypted.toString(
          "base64"
        ),
    };

  return encryptedBackupSchema.parse(
    encryptedBackup
  );
}

export async function decryptDiaryBackup(
  encryptedBackup:
    EncryptedDiaryBackup,
  passphrase: string
): Promise<DiaryBackup> {
  /*
   * Validate the outer envelope
   * before using any cryptographic
   * parameters from it.
   */
  const validatedEnvelope =
    encryptedBackupSchema.parse(
      encryptedBackup
    );

  const salt =
    Buffer.from(
      validatedEnvelope
        .encryption
        .salt,
      "base64"
    );

  const iv =
    Buffer.from(
      validatedEnvelope
        .encryption
        .iv,
      "base64"
    );

  const authTag =
    Buffer.from(
      validatedEnvelope
        .encryption
        .authTag,
      "base64"
    );

  const ciphertext =
    Buffer.from(
      validatedEnvelope
        .ciphertext,
      "base64"
    );

  const key =
    await deriveKey(
      passphrase,
      salt
    );

  const decipher =
    createDecipheriv(
      ALGORITHM,
      key,
      iv
    );

  decipher.setAuthTag(
    authTag
  );

  /*
   * cipher.final()/decipher.final()
   * is where GCM authentication is
   * verified.
   *
   * Wrong passphrase or modified
   * ciphertext causes failure.
   */
  const decrypted =
    Buffer.concat([
      decipher.update(
        ciphertext
      ),

      decipher.final(),
    ]);

  const plaintext =
    decrypted.toString(
      "utf8"
    );

  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        plaintext
      );
  } catch {
    throw new Error(
      "The decrypted backup contains invalid data."
    );
  }

  /*
   * Successful decryption alone
   * isn't enough. The plaintext
   * must also be a valid Diary AI
   * backup.
   */
  return diaryBackupSchema.parse(
    parsed
  );
}