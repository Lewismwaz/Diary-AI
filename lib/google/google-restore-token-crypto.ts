
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const hex =
    process.env.GOOGLE_RESTORE_TOKEN_ENCRYPTION_KEY;

  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "Google restore token encryption key is not configured."
    );
  }

  return Buffer.from(hex, "hex");
}

export function encryptGoogleRestoreToken(
  token: string
): string {
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptGoogleRestoreToken(
  payload: string
): string {
  const parts = payload.split(".");

  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted token format.");
  }

  const [, ivText, tagText, encryptedText] = parts;

  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const encrypted = Buffer.from(
    encryptedText,
    "base64url"
  );

  if (iv.length !== IV_LENGTH || tag.length !== 16) {
    throw new Error("Invalid encrypted token metadata.");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    iv
  );

  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
