
import {
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const GOOGLE_RESTORE_STATE_COOKIE =
  "diary_ai_google_restore_state";

export const GOOGLE_RESTORE_STATE_MAX_AGE =
  10 * 60;

export function createGoogleRestoreState(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyGoogleRestoreState(
  expected: string | undefined,
  received: string | null
): boolean {
  if (!expected || !received) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (
    expectedBuffer.length !== receivedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}
