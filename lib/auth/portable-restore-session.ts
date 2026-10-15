
import {
  createHash,
  randomBytes,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

export const PORTABLE_RESTORE_COOKIE =
  "diary_ai_portable_restore";

export const PORTABLE_RESTORE_MAX_AGE =
  15 * 60;

function hashRestoreToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

/**
 * Create a restore session without requiring
 * an existing User record.
 */
export async function createPortableRestoreSession() {
  const token =
    randomBytes(32).toString("base64url");

  const tokenHash =
    hashRestoreToken(token);

  const expiresAt = new Date(
    Date.now() +
      PORTABLE_RESTORE_MAX_AGE * 1000
  );

  await prisma.portableRestoreSession.create({
    data: {
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

/**
 * Retrieve an active, incomplete restore
 * session using its original secret token.
 */
export async function getPortableRestoreSession(
  token: string
) {
  if (!token) {
    return null;
  }

  const tokenHash =
    hashRestoreToken(token);

  const session =
    await prisma.portableRestoreSession.findUnique({
      where: {
        tokenHash,
      },
    });

  if (!session) {
    return null;
  }

  if (
    session.expiresAt.getTime() <= Date.now() ||
    session.completedAt !== null
  ) {
    return null;
  }

  return session;
}

/**
 * Invalidate a restore session.
 *
 * This is safe to call even if the session
 * was previously deleted.
 */
export async function deletePortableRestoreSession(
  token: string
) {
  if (!token) {
    return;
  }

  await prisma.portableRestoreSession.deleteMany({
    where: {
      tokenHash: hashRestoreToken(token),
    },
  });
}
