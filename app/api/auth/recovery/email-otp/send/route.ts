import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";

import {
  ACCOUNT_RECOVERY_COOKIE,
  getAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";

import {
  RecoveryOtpError,
  sendRecoveryEmailOtp,
} from "@/services/account-recovery-otp.service";

export const runtime = "nodejs";

export async function POST() {
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

  try {
    const result = await sendRecoveryEmailOtp(session.id);

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof RecoveryOtpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Recovery OTP send failed:", error);

    return NextResponse.json(
      { error: "Unable to send the verification email." },
      { status: 500 }
    );
  }
}