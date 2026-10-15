import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  getGoogleAuthorizationUrl,
} from "@/lib/google/google-oauth";

import {
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE,
  hashGoogleOAuthState,
} from "@/lib/google/google-oauth-state";

export const runtime =
  "nodejs";

export async function GET(
  request: Request
) {
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.redirect(
      new URL(
        "/login",
        request.url
      )
    );
  }

  const state =
    createGoogleOAuthState();

  const stateHash =
    hashGoogleOAuthState(
      state
    );

  const authorizationUrl =
    getGoogleAuthorizationUrl(
      state
    );

  const response =
    NextResponse.redirect(
      authorizationUrl
    );

  response.cookies.set({
    name:
      GOOGLE_OAUTH_STATE_COOKIE,

    value:
      stateHash,

    httpOnly: true,

    secure:
      process.env.NODE_ENV === "production" && process.env.DIARY_AI_DESKTOP !== "true" && process.env.DIARY_AI_DESKTOP !== "true",

    sameSite: "lax",

    path:
      "/api/google-drive/callback",

    maxAge:
      GOOGLE_OAUTH_STATE_MAX_AGE,
  });

  return response;
}