import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

const ALGORITHM =
  "aes-256-gcm";

const IV_LENGTH =
  12;

type EncryptedTokenEnvelope = {
  version: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
};

function getEncryptionKey(): Buffer {
  const encodedKey =
    process.env
      .GOOGLE_TOKEN_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY is not configured."
    );
  }

  const key =
    Buffer.from(
      encodedKey,
      "base64"
    );

  if (key.length !== 32) {
    throw new Error(
      "GOOGLE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes."
    );
  }

  return key;
}

export function encryptGoogleToken(
  token: string
): string {
  if (!token) {
    throw new Error(
      "Google token cannot be empty."
    );
  }

  const key =
    getEncryptionKey();

  const iv =
    randomBytes(
      IV_LENGTH
    );

  const cipher =
    createCipheriv(
      ALGORITHM,
      key,
      iv
    );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        token,
        "utf8"
      ),

      cipher.final(),
    ]);

  const authTag =
    cipher.getAuthTag();

  const envelope:
    EncryptedTokenEnvelope = {
      version: 1,

      iv:
        iv.toString(
          "base64"
        ),

      authTag:
        authTag.toString(
          "base64"
        ),

      ciphertext:
        ciphertext.toString(
          "base64"
        ),
    };

  return JSON.stringify(
    envelope
  );
}

export function decryptGoogleToken(
  encryptedToken: string
): string {
  let parsed: unknown;

  try {
    parsed =
      JSON.parse(
        encryptedToken
      );
  } catch {
    throw new Error(
      "Stored Google credential is invalid."
    );
  }

  if (
    typeof parsed !== "object" ||
    parsed === null
  ) {
    throw new Error(
      "Stored Google credential is invalid."
    );
  }

  const envelope =
    parsed as Partial<EncryptedTokenEnvelope>;

  if (
    envelope.version !== 1 ||
    typeof envelope.iv !==
      "string" ||
    typeof envelope.authTag !==
      "string" ||
    typeof envelope.ciphertext !==
      "string"
  ) {
    throw new Error(
      "Stored Google credential is invalid."
    );
  }

  try {
    const key =
      getEncryptionKey();

    const decipher =
      createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(
          envelope.iv,
          "base64"
        )
      );

    decipher.setAuthTag(
      Buffer.from(
        envelope.authTag,
        "base64"
      )
    );

    const plaintext =
      Buffer.concat([
        decipher.update(
          Buffer.from(
            envelope.ciphertext,
            "base64"
          )
        ),

        decipher.final(),
      ]);

    return plaintext.toString(
      "utf8"
    );
  } catch {
    throw new Error(
      "Stored Google credential could not be decrypted."
    );
  }
}