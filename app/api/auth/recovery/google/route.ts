import {
  NextResponse,
} from "next/server";

import { auth } from "@/auth";

import {
  createGoogleRecoveryState,
  GOOGLE_RECOVERY_STATE_COOKIE,
  GOOGLE_RECOVERY_STATE_MAX_AGE,
  hashGoogleRecoveryState,
} from "@/lib/google/google-recovery-state";

import {
  getGoogleRecoveryAuthorizationUrl,
} from "@/lib/google/google-oauth";

export const runtime = "nodejs";

export async function GET(
  request: Request
) {
  const session = await auth();

  if (session?.user?.id) {
    return NextResponse.redirect(
      new URL(
        "/dashboard",
        request.url
      )
    );
  }

  const state =
    createGoogleRecoveryState();

  const stateHash =
    hashGoogleRecoveryState(state);

  const authorizationUrl =
    getGoogleRecoveryAuthorizationUrl(
      state
    );

  const response =
    NextResponse.redirect(
      authorizationUrl
    );

  response.cookies.set(
    GOOGLE_RECOVERY_STATE_COOKIE,
    stateHash,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production" && process.env.DIARY_AI_DESKTOP !== "true" && process.env.DIARY_AI_DESKTOP !== "true",
      maxAge:
        GOOGLE_RECOVERY_STATE_MAX_AGE,
      path:
        "/api/auth/recovery/google/callback",
    }
  );

  return response;
}