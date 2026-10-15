import "server-only";

import { prisma } from "@/lib/prisma";

import {
  generateRecoveryOtp,
  hashRecoveryOtp,
  verifyRecoveryOtpHash,
  RECOVERY_OTP_MAX_ATTEMPTS,
  RECOVERY_OTP_MAX_SENDS,
  RECOVERY_OTP_RESEND_SECONDS,
  RECOVERY_OTP_TTL_SECONDS,
} from "@/lib/auth/recovery-otp";

import {
  ACCOUNT_RECOVERY_MAX_AGE,
} from "@/lib/auth/account-recovery-session";

import {
  sendRecoveryOtpEmail,
} from "@/lib/email/mailer";

export class RecoveryOtpError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "RecoveryOtpError";
  }
}

const MAX_RECOVERY_SENDS = RECOVERY_OTP_MAX_SENDS;

export async function getRecoveryEmailStatus(
  sessionId: string
) {
  const session = await prisma.accountRecoverySession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      backupVerifiedAt: true,
      emailVerifiedAt: true,
      otpSentCount: true,
      otpLastSentAt: true,
      expiresAt: true,
      user: {
        select: { email: true },
      },
    },
  });

  if (
    !session ||
    !session.backupVerifiedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new RecoveryOtpError(
      "Your recovery session has expired or is incomplete.",
      401
    );
  }

  const email = session.user.email;
  const [local, domain] = email.split("@");

  const maskedEmail =
    local && domain
      ? `${local.slice(0, 2)}••••@${domain}`
      : "your registered email";

  const cooldownSeconds = session.otpLastSentAt
    ? Math.max(
        0,
        RECOVERY_OTP_RESEND_SECONDS -
          Math.floor(
            (Date.now() - session.otpLastSentAt.getTime()) /
              1000
          )
      )
    : 0;

  return {
    maskedEmail,
    verified: Boolean(session.emailVerifiedAt),
    sentCount: session.otpSentCount,
    maxSends: MAX_RECOVERY_SENDS,
    cooldownSeconds,
  };
}

export async function sendRecoveryEmailOtp(
  sessionId: string
) {
  const session = await prisma.accountRecoverySession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      backupVerifiedAt: true,
      emailVerifiedAt: true,
      expiresAt: true,
      otpSentCount: true,
      otpLastSentAt: true,
      user: {
        select: { email: true },
      },
    },
  });

  if (
    !session ||
    !session.backupVerifiedAt ||
    session.expiresAt <= new Date()
  ) {
    throw new RecoveryOtpError(
      "Your recovery session has expired or is incomplete.",
      401
    );
  }

  if (session.emailVerifiedAt) {
    throw new RecoveryOtpError(
      "Email verification is already complete.",
      409
    );
  }

  if (session.otpSentCount >= MAX_RECOVERY_SENDS) {
    throw new RecoveryOtpError(
      "The email verification send limit has been reached. Start recovery again.",
      429
    );
  }

  const now = new Date();

  const cooldownCutoff = new Date(
    now.getTime() - RECOVERY_OTP_RESEND_SECONDS * 1000
  );

  const code = generateRecoveryOtp();
  const otpHash = hashRecoveryOtp(sessionId, code);

  /*
   * Atomically claim the send slot before contacting SMTP.
   * Concurrent requests cannot both claim the same slot.
   */
  const claimed = await prisma.accountRecoverySession.updateMany({
    where: {
      id: sessionId,
      backupVerifiedAt: { not: null },
      emailVerifiedAt: null,
      expiresAt: { gt: now },
      otpSentCount: { lt: MAX_RECOVERY_SENDS },
      OR: [
        { otpLastSentAt: null },
        { otpLastSentAt: { lte: cooldownCutoff } },
      ],
    },
    data: {
      otpHash,
      otpExpiresAt: new Date(
        now.getTime() + RECOVERY_OTP_TTL_SECONDS * 1000
      ),
      otpAttempts: 0,
      otpSentCount: { increment: 1 },
      otpLastSentAt: now,
    },
  });

  if (claimed.count !== 1) {
    throw new RecoveryOtpError(
      "Please wait before requesting another code, or start recovery again if the limit was reached.",
      429
    );
  }

  try {
    await sendRecoveryOtpEmail(session.user.email, code);
  } catch (error) {
    console.error("Recovery OTP email delivery failed:", error);

    /*
     * Clear the undelivered code, but preserve the send
     * count/cooldown. SMTP failures may occur after the
     * provider accepted the message, so automatically
     * refunding the send slot would permit abuse.
     */
    await prisma.accountRecoverySession.updateMany({
      where: {
        id: sessionId,
        otpHash,
      },
      data: {
        otpHash: null,
        otpExpiresAt: null,
      },
    });

    throw new RecoveryOtpError(
      "The verification email could not be sent. Please try again later.",
      503
    );
  }

  return {
    sent: true,
    cooldownSeconds: RECOVERY_OTP_RESEND_SECONDS,
  };
}

export async function verifyRecoveryEmailOtp(
  sessionId: string,
  code: string
) {
  const session = await prisma.accountRecoverySession.findUnique({
    where: { id: sessionId },
    select: {
      googleVerifiedAt: true,
      backupVerifiedAt: true,
      emailVerifiedAt: true,
      otpHash: true,
      otpExpiresAt: true,
      otpAttempts: true,
      expiresAt: true,
    },
  });

  const now = new Date();

  if (
    !session ||
    !session.googleVerifiedAt ||
    !session.backupVerifiedAt ||
    session.expiresAt <= now
  ) {
    throw new RecoveryOtpError(
      "Your recovery session has expired or is incomplete.",
      401
    );
  }

  if (session.emailVerifiedAt) {
    return { verified: true };
  }

  if (
    !session.otpHash ||
    !session.otpExpiresAt ||
    session.otpExpiresAt <= now
  ) {
    throw new RecoveryOtpError(
      "The verification code has expired. Request a new code.",
      400
    );
  }

  if (session.otpAttempts >= RECOVERY_OTP_MAX_ATTEMPTS) {
    throw new RecoveryOtpError(
      "Too many incorrect attempts. Request a new code.",
      429
    );
  }

  const matches = verifyRecoveryOtpHash(
    sessionId,
    code,
    session.otpHash
  );

  if (!matches) {
    const updated = await prisma.accountRecoverySession.updateMany({
      where: {
        id: sessionId,
        otpHash: session.otpHash,
        emailVerifiedAt: null,
        expiresAt: { gt: now },
        otpExpiresAt: { gt: now },
        otpAttempts: { lt: RECOVERY_OTP_MAX_ATTEMPTS },
      },
      data: {
        otpAttempts: { increment: 1 },
      },
    });

    if (updated.count !== 1) {
      throw new RecoveryOtpError(
        "This code is no longer valid or the attempt limit has been reached.",
        429
      );
    }

    throw new RecoveryOtpError(
      "Incorrect verification code.",
      400
    );
  }

  const updated = await prisma.accountRecoverySession.updateMany({
    where: {
      id: sessionId,
      otpHash: session.otpHash,
      emailVerifiedAt: null,
      expiresAt: { gt: now },
      otpExpiresAt: { gt: now },
      otpAttempts: { lt: RECOVERY_OTP_MAX_ATTEMPTS },
    },
    data: {
      emailVerifiedAt: now,
      otpHash: null,
      otpExpiresAt: null,
      expiresAt: new Date(
        now.getTime() + ACCOUNT_RECOVERY_MAX_AGE * 1000
      ),
    },
  });

  if (updated.count !== 1) {
    throw new RecoveryOtpError(
      "The code is no longer valid. Please try again.",
      409
    );
  }

  return { verified: true };
}