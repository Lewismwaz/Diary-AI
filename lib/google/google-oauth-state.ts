import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export const GOOGLE_OAUTH_STATE_COOKIE =
  "diary_ai_google_oauth_state";

export const GOOGLE_OAUTH_STATE_MAX_AGE =
  10 * 60;

export function createGoogleOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function hashGoogleOAuthState(
  state: string
): string {
  return createHash("sha256")
    .update(state)
    .digest("base64url");
}

export function verifyGoogleOAuthState(
  state: string,
  expectedHash: string
): boolean {
  const actualHash =
    hashGoogleOAuthState(state);

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