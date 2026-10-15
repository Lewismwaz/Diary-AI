import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  resetPasswordSchema,
} from "@/domain/auth/reset-password.schema";
import {
  ACCOUNT_RECOVERY_COOKIE,
  getAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";
import { prisma } from "@/lib/prisma";

import { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";

function isTransactionConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function POST(request: Request) {
  try {
    const currentSession = await auth();

    if (currentSession?.user?.id) {
      return NextResponse.json(
        { error: "Sign out before recovering your account." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    const recoveryToken =
      cookieStore.get(ACCOUNT_RECOVERY_COOKIE)?.value;

    if (!recoveryToken) {
      return NextResponse.json(
        { error: "Your recovery session is missing. Start again." },
        { status: 401 }
      );
    }

    const recovery =
      await getAccountRecoverySession(recoveryToken);

    if (
      !recovery ||
      !recovery.googleVerifiedAt ||
      !recovery.backupVerifiedAt ||
      !recovery.emailVerifiedAt
    ) {
      return NextResponse.json(
        { error: "Complete all recovery verification steps first." },
        { status: 403 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const validation =
      resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error.issues[0]?.message ??
            "Invalid password.",
          issues: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const connection =
      await prisma.googleBackupConnection.findUnique({
        where: { userId: recovery.userId },
        select: { userId: true },
      });

    if (!connection) {
      return NextResponse.json(
        { error: "Google backup recovery is no longer available." },
        { status: 403 }
      );
    }

    
    /*
     * Check whether the proposed password
     * matches the existing account password.
     *
     * Never return or expose the stored hash.
     */
    const existingUser =
      await prisma.user.findUnique({
        where: {
          id: recovery.userId,
        },
        select: {
          passwordHash: true,
        },
      });

    if (!existingUser) {
      return NextResponse.json(
        {
          error:
            "The account could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const isSamePassword =
      await bcrypt.compare(
        validation.data.newPassword,
        existingUser.passwordHash
      );

    if (isSamePassword) {
      return NextResponse.json(
        {
          error:
            "Your new password must be different from your current password.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Hash the validated new password
     * before entering the transaction.
     */
    const newPasswordHash =
      await bcrypt.hash(
        validation.data.newPassword,
        12
      );


    const result = await prisma.$transaction(
      async (tx) => {
        const now = new Date();

        /*
         * Claim this recovery session exactly once.
         * The guarded deletion must succeed before
         * changing any account credentials.
         */
        
    const consumed = await tx.accountRecoverySession.deleteMany({
      where: {
        id: recovery.id,
        userId: recovery.userId,

        // Google verification is guaranteed by
        // the required googleVerifiedAt field.

        // Both additional recovery factors
        // must have been verified.
        backupVerifiedAt: {
          not: null,
        },

        emailVerifiedAt: {
          not: null,
        },

        // Reject expired recovery sessions.
        expiresAt: {
          gt: now,
        },

        // Google recovery connection
        // must still exist.
        user: {
          googleBackupConnection: {
            isNot: null,
          },
        },
      },
    });


        if (consumed.count !== 1) {
          return { updated: false };
        }

        /*
         * Existing users only.
         * No account creation occurs here.
         */
        const updatedUser = await tx.user.update({
          where: {
            id: recovery.userId,
          },
          data: {
            passwordHash: newPasswordHash,
            sessionVersion: {
              increment: 1,
            },
          },
          select: {
            id: true,
          },
        });

        /*
         * Revoke any other recovery sessions
         * belonging to this account.
         */
        await tx.accountRecoverySession.deleteMany({
          where: {
            userId: updatedUser.id,
          },
        });

        return { updated: true };
      },
      {
        isolationLevel: "Serializable",
      }
    );

    if (!result.updated) {
      return NextResponse.json(
        { error: "Recovery authorization expired or was already used." },
        { status: 409 }
      );
    }

    const response = NextResponse.json({
      data: {
        success: true,
        message: "Password reset successfully. Sign in with your new password.",
      },
    });

    response.cookies.set(
      ACCOUNT_RECOVERY_COOKIE,
      "",
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    if (isTransactionConflict(error)) {
      return NextResponse.json(
        {
          error:
            "Another account recovery request was processed. Please restart recovery if your password was not changed.",
        },
        {
          status: 409,
        }
      );
    }
    
    console.error(
      "POST /api/auth/recovery/reset-password failed:",
      error
    );

    return NextResponse.json(
      { error: "Unable to reset your password. Please try again." },
      { status: 500 }
    );
  }
}
