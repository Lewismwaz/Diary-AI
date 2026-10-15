import {
  createHash,
  randomBytes,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

export const ACCOUNT_RECOVERY_COOKIE =
  "diary_ai_account_recovery";

export const ACCOUNT_RECOVERY_MAX_AGE =
  15 * 60;

function hashRecoveryToken(
  token: string
): string {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function createAccountRecoverySession(
  userId: string
) {
  const token =
    randomBytes(32).toString("base64url");

  const tokenHash =
    hashRecoveryToken(token);

  const expiresAt =
    new Date(
      Date.now() +
        ACCOUNT_RECOVERY_MAX_AGE * 1000
    );

  await prisma.accountRecoverySession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
  };
}

export async function getAccountRecoverySession(
  token: string
) {
  const tokenHash =
    hashRecoveryToken(token);

  const recoverySession =
    await prisma.accountRecoverySession.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        userId: true,
        googleVerifiedAt: true,
        backupVerifiedAt: true,
        emailVerifiedAt: true,
        otpHash: true,
        otpExpiresAt: true,
        otpAttempts: true,
        otpSentCount: true,
        otpLastSentAt: true,
        expiresAt: true,
      },
    });

  if (!recoverySession) {
    return null;
  }

  if (
    recoverySession.expiresAt.getTime() <=
    Date.now()
  ) {
    await prisma.accountRecoverySession.delete({
      where: {
        id: recoverySession.id,
      },
    });

    return null;
  }

  return recoverySession;
}