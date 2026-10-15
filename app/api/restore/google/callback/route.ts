
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

import {
  createGoogleRestoreOAuthClient,
} from "@/lib/google/google-restore-oauth";

import {
  GOOGLE_RESTORE_STATE_COOKIE,
  verifyGoogleRestoreState,
} from "@/lib/google/google-restore-state";

import {
  createPortableRestoreSession,
  deletePortableRestoreSession,
  PORTABLE_RESTORE_COOKIE,
  PORTABLE_RESTORE_MAX_AGE,
} from "@/lib/auth/portable-restore-session";

import {
  encryptGoogleRestoreToken,
} from "@/lib/google/google-restore-token-crypto";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function redirectWithError(
  request: NextRequest,
  error: string
) {
  const url = new URL("/restore", request.url);
  url.searchParams.set("error", error);

  const response = NextResponse.redirect(url);

  response.headers.set("Cache-Control", "no-store");

  response.cookies.delete(GOOGLE_RESTORE_STATE_COOKIE);
  response.cookies.delete(PORTABLE_RESTORE_COOKIE);

  return response;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get("code");
  const receivedState = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieStore = await cookies();

  const expectedState = cookieStore.get(
    GOOGLE_RESTORE_STATE_COOKIE
  )?.value;

  if (
    !verifyGoogleRestoreState(
      expectedState,
      receivedState
    )
  ) {
    return redirectWithError(
      request,
      "invalid_google_state"
    );
  }

  if (oauthError || !code) {
    return redirectWithError(
      request,
      "google_authorization_failed"
    );
  }

  let restoreToken: string | null = null;

  try {
    const oauthClient =
      createGoogleRestoreOAuthClient();

    const { tokens } = await oauthClient.getToken(code);

    if (!tokens.access_token) {
      throw new Error("Missing Google access token.");
    }

    oauthClient.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: "v2",
      auth: oauthClient,
    });

    const { data: identity } =
      await oauth2.userinfo.get();

    if (
      !identity.id ||
      !identity.email ||
      identity.verified_email !== true
    ) {
      throw new Error(
        "Google account identity could not be verified."
      );
    }

    const encryptedAccessToken =
      encryptGoogleRestoreToken(
        tokens.access_token
      );

    const restoreSession =
      await createPortableRestoreSession();

    restoreToken = restoreSession.token;

    const tokenHash = (
      await import("node:crypto")
    ).createHash("sha256")
      .update(restoreToken)
      .digest("hex");

    await prisma.portableRestoreSession.update({
      where: {
        tokenHash,
      },
      data: {
        googleAccountId: identity.id,
        googleEmail: identity.email,
        googleVerifiedAt: new Date(),
        encryptedGoogleAccessToken:
          encryptedAccessToken,
      },
    });

    const response = NextResponse.redirect(
      new URL("/restore", request.url)
    );

    response.headers.set("Cache-Control", "no-store");

    response.cookies.delete(GOOGLE_RESTORE_STATE_COOKIE);

    response.cookies.set(
      PORTABLE_RESTORE_COOKIE,
      restoreToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production" && process.env.DIARY_AI_DESKTOP !== "true" && process.env.DIARY_AI_DESKTOP !== "true",
        sameSite: "lax",
        path: "/",
        maxAge: PORTABLE_RESTORE_MAX_AGE,
      }
    );

    return response;
  } catch (error) {
    if (restoreToken) {
      await deletePortableRestoreSession(
        restoreToken
      ).catch(() => undefined);
    }

    console.error(
      "Google restore callback failed:",
      error instanceof Error
        ? error.name
        : "UnknownError"
    );

    return redirectWithError(
      request,
      "google_verification_failed"
    );
  }
}
