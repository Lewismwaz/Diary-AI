import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  createGoogleOAuthClient,
} from "@/lib/google/google-oauth";

import {
  GOOGLE_OAUTH_STATE_COOKIE,
  verifyGoogleOAuthState,
} from "@/lib/google/google-oauth-state";

import {
  GoogleAccountAlreadyLinkedError,
  GoogleRefreshTokenRequiredError,
  saveGoogleBackupConnection,
} from "@/services/google-backup-connection.service";

export const runtime =
  "nodejs";

function settingsRedirect(
  request: Request,
  status: string
) {
  const url =
    new URL(
      "/settings",
      request.url
    );

  url.searchParams.set(
    "googleDrive",
    status
  );

  return NextResponse.redirect(
    url
  );
}

export async function GET(
  request: Request
) {
  const requestUrl =
    new URL(
      request.url
    );

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  const state =
    requestUrl.searchParams.get(
      "state"
    );

  const oauthError =
    requestUrl.searchParams.get(
      "error"
    );

  const stateCookie =
    request.headers
      .get("cookie")
      ?.split(";")
      .map((cookie) =>
        cookie.trim()
      )
      .find((cookie) =>
        cookie.startsWith(
          `${GOOGLE_OAUTH_STATE_COOKIE}=`
        )
      );

  const expectedStateHash =
    stateCookie
      ? decodeURIComponent(
          stateCookie.substring(
            GOOGLE_OAUTH_STATE_COOKIE.length +
              1
          )
        )
      : null;

  /*
   * Validate state before processing either
   * a successful or failed OAuth response.
   */
  if (
    !state ||
    !expectedStateHash ||
    !verifyGoogleOAuthState(
      state,
      expectedStateHash
    )
  ) {
    return settingsRedirect(
      request,
      "invalid_state"
    );
  }

  if (oauthError) {
    return settingsRedirect(
      request,
      "cancelled"
    );
  }

  if (!code) {
    return settingsRedirect(
      request,
      "failed"
    );
  }

  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    return settingsRedirect(
      request,
      "session_expired"
    );
  }

  try {
    const oauthClient =
      createGoogleOAuthClient();

    const {
      tokens,
    } =
      await oauthClient.getToken(
        code
      );

    oauthClient.setCredentials(
      tokens
    );

    /*
     * Verify identity through Google's
     * OpenID Connect userinfo endpoint.
     *
     * `sub` is the stable Google account
     * identifier. Email is display/
     * consistency information only.
     */
    const oauth2 =
      (
        await import(
          "googleapis"
        )
      ).google.oauth2({
        version: "v2",
        auth: oauthClient,
      });

    const {
      data: profile,
    } =
      await oauth2.userinfo.get();

    const googleAccountId =
      profile.id;

    const googleEmail =
      profile.email;

    const emailVerified =
      profile.verified_email;

    if (
      !googleAccountId ||
      !googleEmail ||
      emailVerified !== true
    ) {
      return settingsRedirect(
        request,
        "identity_failed"
      );
    }

    await saveGoogleBackupConnection({
      userId,
      googleAccountId,
      googleEmail,
      refreshToken:
        tokens.refresh_token ??
        null,
    });

    const response =
      settingsRedirect(
        request,
        "connected"
      );

    response.cookies.set({
      name:
        GOOGLE_OAUTH_STATE_COOKIE,

      value: "",

      httpOnly: true,

      secure:
        process.env.NODE_ENV === "production" && process.env.DIARY_AI_DESKTOP !== "true" && process.env.DIARY_AI_DESKTOP !== "true",

      sameSite: "lax",

      path:
        "/api/google-drive/callback",

      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error(
      "Google Drive OAuth callback failed:",
      error
    );

    if (
      error instanceof
      GoogleAccountAlreadyLinkedError
    ) {
      return settingsRedirect(
        request,
        "already_linked"
      );
    }

    if (
      error instanceof
      GoogleRefreshTokenRequiredError
    ) {
      return settingsRedirect(
        request,
        "refresh_token_missing"
      );
    }

    return settingsRedirect(
      request,
      "failed"
    );
  }
}