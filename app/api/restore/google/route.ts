
import {
  NextResponse,
} from "next/server";

import {
  createGoogleRestoreState,
  GOOGLE_RESTORE_STATE_COOKIE,
  GOOGLE_RESTORE_STATE_MAX_AGE,
} from "@/lib/google/google-restore-state";

import {
  getGoogleRestoreAuthorizationUrl,
} from "@/lib/google/google-restore-oauth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const state = createGoogleRestoreState();

    const authorizationUrl =
      getGoogleRestoreAuthorizationUrl(state);

    const response = NextResponse.redirect(
      authorizationUrl
    );

    response.headers.set(
      "Cache-Control",
      "no-store"
    );

    response.cookies.set(
      GOOGLE_RESTORE_STATE_COOKIE,
      state,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" && process.env.DIARY_AI_DESKTOP !== "true" && process.env.DIARY_AI_DESKTOP !== "true",
        sameSite: "lax",
        path: "/",
        maxAge:
          GOOGLE_RESTORE_STATE_MAX_AGE,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Unable to initiate Google restore authorization:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return NextResponse.json(
      {
        error:
          "Unable to start Google verification.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}
