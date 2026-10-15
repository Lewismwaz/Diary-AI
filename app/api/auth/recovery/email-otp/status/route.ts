import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";

import {
  ACCOUNT_RECOVERY_COOKIE,
  getAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";

import {
  RecoveryOtpError,
  getRecoveryEmailStatus,
} from "@/services/account-recovery-otp.service";

export const runtime = "nodejs";

export async function GET() {
  const signedIn = await auth();

  if (signedIn?.user?.id) {
    return NextResponse.json(
      { error: "Account recovery is unavailable while signed in." },
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
      { error: "Recovery session expired." },
      { status: 401 }
    );
  }

  try {
    const result = await getRecoveryEmailStatus(session.id);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof RecoveryOtpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Recovery email status failed:", error);

    return NextResponse.json(
      { error: "Unable to load verification status." },
      { status: 500 }
    );
  }
}