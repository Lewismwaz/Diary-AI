import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const GOOGLE_RECOVERY_STATE_COOKIE =
  "diary_ai_google_recovery_state";

export const GOOGLE_RECOVERY_STATE_MAX_AGE =
  10 * 60;

export function createGoogleRecoveryState(): string {
  return randomBytes(32).toString("base64url");
}

export function hashGoogleRecoveryState(
  state: string
): string {
  return createHash("sha256")
    .update(state)
    .digest("base64url");
}

export function verifyGoogleRecoveryState(
  state: string,
  expectedHash: string
): boolean {
  const actualHash =
    hashGoogleRecoveryState(state);

  const actualBuffer =
    Buffer.from(actualHash);

  const expectedBuffer =
    Buffer.from(expectedHash);

  if (
    actualBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    actualBuffer,
    expectedBuffer
  );
}