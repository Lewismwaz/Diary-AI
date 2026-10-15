import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { z } from "zod";

import {
  ACCOUNT_RECOVERY_COOKIE,
  getAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";

import {
  RecoveryOtpError,
  verifyRecoveryEmailOtp,
} from "@/services/account-recovery-otp.service";

export const runtime = "nodejs";

const requestSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit code."),
});

export async function POST(request: Request) {
  const signedIn = await auth();

  if (signedIn?.user?.id) {
    return NextResponse.json(
      { error: "Sign out before starting account recovery." },
      { status: 409 }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCOUNT_RECOVERY_COOKIE)?.value;

  const session = token
    ? await getAccountRecoverySession(token)
    : null;

  if (!session || !session.backupVerifiedAt) {
    return NextResponse.json(
      { error: "Your recovery session has expired or is incomplete." },
      { status: 401 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid code." },
      { status: 400 }
    );
  }

  try {
    const result = await verifyRecoveryEmailOtp(
      session.id,
      parsed.data.code
    );

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof RecoveryOtpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Recovery OTP verification failed:", error);

    return NextResponse.json(
      { error: "Unable to verify the code." },
      { status: 500 }
    );
  }
}