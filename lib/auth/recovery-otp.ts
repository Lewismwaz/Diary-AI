import "server-only";

import {
  createHmac,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

export const RECOVERY_OTP_LENGTH = 6;
export const RECOVERY_OTP_TTL_SECONDS = 10 * 60;
export const RECOVERY_OTP_RESEND_SECONDS = 60;
export const RECOVERY_OTP_MAX_ATTEMPTS = 5;
export const RECOVERY_OTP_MAX_SENDS = 3;

function getOtpSecret(): Buffer {
  const secret = process.env.RECOVERY_OTP_SECRET;

  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error(
      "RECOVERY_OTP_SECRET must be a 64-character hexadecimal value."
    );
  }

  return Buffer.from(secret, "hex");
}

export function generateRecoveryOtp(): string {
  return randomInt(0, 1_000_000)
    .toString()
    .padStart(RECOVERY_OTP_LENGTH, "0");
}

export function hashRecoveryOtp(
  sessionId: string,
  code: string
): string {
  return createHmac("sha256", getOtpSecret())
    .update(`${sessionId}:${code}`)
    .digest("hex");
}

export function verifyRecoveryOtpHash(
  sessionId: string,
  code: string,
  expectedHash: string
): boolean {
  if (!/^\d{6}$/.test(code)) {
    return false;
  }

  if (!/^[a-fA-F0-9]{64}$/.test(expectedHash)) {
    return false;
  }

  const actual = Buffer.from(
    hashRecoveryOtp(sessionId, code),
    "hex"
  );

  const expected = Buffer.from(
    expectedHash,
    "hex"
  );

  return timingSafeEqual(actual, expected);
}