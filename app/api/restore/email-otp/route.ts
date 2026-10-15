import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  getPortableRestoreSession,
  PORTABLE_RESTORE_COOKIE,
} from "@/lib/auth/portable-restore-session";

import {
  generateRecoveryOtp,
  hashRecoveryOtp,
  verifyRecoveryOtpHash,
  RECOVERY_OTP_MAX_ATTEMPTS,
  RECOVERY_OTP_MAX_SENDS,
  RECOVERY_OTP_RESEND_SECONDS,
  RECOVERY_OTP_TTL_SECONDS,
} from "@/lib/auth/recovery-otp";

import { sendRecoveryOtpEmail } from "@/lib/email/mailer";

export const runtime = "nodejs";

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("send"),
  }),
  z.object({
    action: z.literal("verify"),
    code: z.string().regex(/^\d{6}$/),
  }),
]);

function reply(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function activeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PORTABLE_RESTORE_COOKIE)?.value;

  const session = token
    ? await getPortableRestoreSession(token)
    : null;

  if (
    !session?.googleVerifiedAt ||
    !session.backupVerifiedAt ||
    !session.googleFileId ||
    !session.backupDigest ||
    !session.recoveryEmail
  ) {
    return null;
  }

  return session;
}

function maskedEmail(email: string) {
  const [local, domain] = email.split("@");

  if (!local || !domain) return "your recovery email";

  return `${local.slice(0, 2)}••••@${domain}`;
}

export async function GET() {
  const session = await activeSession();

  if (!session) {
    return reply(
      { error: "Restore session expired or incomplete." },
      401
    );
  }

  const remainingCooldown = session.otpLastSentAt
    ? Math.max(
        0,
        RECOVERY_OTP_RESEND_SECONDS -
          Math.floor(
            (Date.now() - session.otpLastSentAt.getTime()) /
              1000
          )
      )
    : 0;

  return reply({
    maskedEmail: maskedEmail(session.recoveryEmail!),
    verified: Boolean(session.emailVerifiedAt),
    sentCount: session.otpSentCount,
    maxSends: RECOVERY_OTP_MAX_SENDS,
    cooldownSeconds: remainingCooldown,
    codePending: Boolean(
      session.otpHash &&
        session.otpExpiresAt &&
        session.otpExpiresAt > new Date()
    ),
  });
}

export async function POST(request: NextRequest) {
  if (
    request.headers.get("origin") !==
    request.nextUrl.origin
  ) {
    return reply({ error: "Invalid request origin." }, 403);
  }

  const session = await activeSession();

  if (!session) {
    return reply(
      { error: "Restore session expired or incomplete." },
      401
    );
  }

  const parsed = bodySchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return reply({ error: "Invalid request." }, 400);
  }

  if (session.emailVerifiedAt) {
    return reply({
      verified: true,
      nextStep: "account-preview",
    });
  }

  if (parsed.data.action === "send") {
    const now = new Date();

    const cooldownCutoff = new Date(
      now.getTime() - RECOVERY_OTP_RESEND_SECONDS * 1000
    );

    const code = generateRecoveryOtp();
    const otpHash = hashRecoveryOtp(session.id, code);

    const claimed =
      await prisma.portableRestoreSession.updateMany({
        where: {
          id: session.id,
          completedAt: null,
          backupVerifiedAt: { not: null },
          emailVerifiedAt: null,
          expiresAt: { gt: now },
          otpSentCount: { lt: RECOVERY_OTP_MAX_SENDS },
          OR: [
            { otpLastSentAt: null },
            { otpLastSentAt: { lte: cooldownCutoff } },
          ],
        },
        data: {
          otpHash,
          otpExpiresAt: new Date(
            now.getTime() +
              RECOVERY_OTP_TTL_SECONDS * 1000
          ),
          otpAttempts: 0,
          otpSentCount: { increment: 1 },
          otpLastSentAt: now,
        },
      });

    if (claimed.count !== 1) {
      return reply(
        {
          error:
            "Please wait before requesting another code, or restart restoration if the send limit was reached.",
        },
        429
      );
    }

    try {
      await sendRecoveryOtpEmail(
        session.recoveryEmail!,
        code
      );
    } catch {
      // Do not refund the send slot: SMTP might have
      // accepted the email before reporting failure.
      await prisma.portableRestoreSession.updateMany({
        where: {
          id: session.id,
          otpHash,
        },
        data: {
          otpHash: null,
          otpExpiresAt: null,
        },
      });

      return reply(
        { error: "Email delivery failed. Try again later." },
        503
      );
    }

    return reply({
      sent: true,
      cooldownSeconds: RECOVERY_OTP_RESEND_SECONDS,
      message: "Verification code sent.",
    });
  }

  const now = new Date();

  // Atomically reserve an attempt to prevent
  // concurrent guesses bypassing the attempt limit.
  const reserved =
    await prisma.portableRestoreSession.updateMany({
      where: {
        id: session.id,
        completedAt: null,
        emailVerifiedAt: null,
        expiresAt: { gt: now },
        otpHash: { not: null },
        otpExpiresAt: { gt: now },
        otpAttempts: {
          lt: RECOVERY_OTP_MAX_ATTEMPTS,
        },
      },
      data: {
        otpAttempts: { increment: 1 },
      },
    });

  if (reserved.count !== 1) {
    return reply(
      {
        error:
          "Code expired or attempt limit reached. Request another code.",
      },
      429
    );
  }

  const current =
    await prisma.portableRestoreSession.findUnique({
      where: { id: session.id },
    });

  if (
    !current?.otpHash ||
    !current.otpExpiresAt ||
    current.otpExpiresAt <= new Date() ||
    current.otpAttempts > RECOVERY_OTP_MAX_ATTEMPTS
  ) {
    return reply(
      { error: "Verification code expired or unavailable." },
      400
    );
  }

  const matches = verifyRecoveryOtpHash(
    session.id,
    parsed.data.code,
    current.otpHash
  );

  if (!matches) {
    return reply(
      { error: "Incorrect verification code." },
      400
    );
  }

  // Bind success to the exact code that was verified.
  // A concurrent resend cannot silently change it.
  const updated =
    await prisma.portableRestoreSession.updateMany({
      where: {
        id: session.id,
        completedAt: null,
        emailVerifiedAt: null,
        expiresAt: { gt: new Date() },
        otpHash: current.otpHash,
        otpExpiresAt: { gt: new Date() },
      },
      data: {
        emailVerifiedAt: new Date(),
        otpHash: null,
        otpExpiresAt: null,
        otpAttempts: 0,
      },
    });

  if (updated.count !== 1) {
    return reply(
      {
        error:
          "Verification state changed. Please try again.",
      },
      409
    );
  }

  return reply({
    verified: true,
    nextStep: "account-preview",
    message: "Recovery email verified successfully.",
  });
}
