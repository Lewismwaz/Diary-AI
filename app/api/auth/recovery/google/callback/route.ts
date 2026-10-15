import {
  NextResponse,
} from "next/server";

import {
  cookies,
} from "next/headers";

import { google } from "googleapis";

import { auth } from "@/auth";

import { prisma } from "@/lib/prisma";

import {
  createGoogleRecoveryOAuthClient,
} from "@/lib/google/google-oauth";

import {
  GOOGLE_RECOVERY_STATE_COOKIE,
  verifyGoogleRecoveryState,
} from "@/lib/google/google-recovery-state";

import {
  ACCOUNT_RECOVERY_COOKIE,
  ACCOUNT_RECOVERY_MAX_AGE,
  createAccountRecoverySession,
} from "@/lib/auth/account-recovery-session";

export const runtime = "nodejs";

function recoveryRedirect(
  request: Request,
  status: string
) {
  return NextResponse.redirect(
    new URL(
      `/recover?status=${encodeURIComponent(
        status
      )}`,
      request.url
    )
  );
}

export async function GET(
  request: Request
) {
  /*
   * Recovery is only for users who cannot
   * authenticate normally.
   */
  const session = await auth();

  if (session?.user?.id) {
    return NextResponse.redirect(
      new URL(
        "/dashboard",
        request.url
      )
    );
  }

  const requestUrl =
    new URL(request.url);

  const code =
    requestUrl.searchParams.get(
      "code"
    );

  const state =
    requestUrl.searchParams.get(
      "state"
    );

  const googleError =
    requestUrl.searchParams.get(
      "error"
    );

  const cookieStore =
    await cookies();

  const expectedStateHash =
    cookieStore.get(
      GOOGLE_RECOVERY_STATE_COOKIE
    )?.value;

  /*
   * Validate state before trusting the OAuth
   * callback.
   */
  if (
    !state ||
    !expectedStateHash ||
    !verifyGoogleRecoveryState(
      state,
      expectedStateHash
    )
  ) {
    const response =
      recoveryRedirect(
        request,
        "invalid_state"
      );

    response.cookies.delete(
      GOOGLE_RECOVERY_STATE_COOKIE
    );

    return response;
  }

  /*
   * The state is single-use from Diary AI's
   * perspective. Clear it regardless of what
   * happens next.
   */
  const clearStateCookie = (
    response: NextResponse
  ) => {
    response.cookies.delete(
      GOOGLE_RECOVERY_STATE_COOKIE
    );

    return response;
  };

  if (googleError) {
    return clearStateCookie(
      recoveryRedirect(
        request,
        "google_cancelled"
      )
    );
  }

  if (!code) {
    return clearStateCookie(
      recoveryRedirect(
        request,
        "missing_code"
      )
    );
  }

  try {
    const oauthClient =
      createGoogleRecoveryOAuthClient();

    const {
      tokens,
    } =
      await oauthClient.getToken(
        code
      );

    if (!tokens.access_token) {
      return clearStateCookie(
        recoveryRedirect(
          request,
          "google_failed"
        )
      );
    }

    oauthClient.setCredentials(
      tokens
    );

    /*
     * Identity lookup only.
     *
     * We are NOT creating or reconnecting a
     * GoogleBackupConnection here.
     */
    const oauth2 =
      google.oauth2({
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

    if (
      !googleAccountId ||
      !googleEmail
    ) {
      return clearStateCookie(
        recoveryRedirect(
          request,
          "google_identity_failed"
        )
      );
    }

    /*
     * This is the central recovery eligibility
     * check.
     *
     * Only an ACTIVE server-side Google backup
     * connection may identify an account for
     * recovery.
     *
     * Old .diarybackup files sitting in Drive
     * are NOT sufficient.
     */
    const connection =
      await prisma.googleBackupConnection.findUnique({
        where: {
          googleAccountId,
        },

        select: {
          userId: true,
          googleEmail: true,
        },
      });

    if (!connection) {
      return clearStateCookie(
        recoveryRedirect(
          request,
          "not_eligible"
        )
      );
    }

    /*
     * Email is secondary consistency information.
     * Google's stable account ID is the actual
     * identity key.
     */
    if (
      connection.googleEmail.toLowerCase() !==
      googleEmail.toLowerCase()
    ) {
      console.warn(
        "Google recovery email changed for linked Google account."
      );
    }

    /*
     * Invalidate older unfinished recovery
     * attempts for this Diary AI account.
     */
    await prisma.accountRecoverySession.deleteMany({
      where: {
        userId:
          connection.userId,
      },
    });

    const recoverySession =
      await createAccountRecoverySession(
        connection.userId
      );

    const response =
      NextResponse.redirect(
        new URL(
          "/recover/verify-backup",
          request.url
        )
      );

    response.cookies.set(
      ACCOUNT_RECOVERY_COOKIE,
      recoverySession.token,
      {
        httpOnly: true,

        sameSite: "lax",

        secure:
          process.env.NODE_ENV === "production" && process.env.DIARY_AI_DESKTOP !== "true" && process.env.DIARY_AI_DESKTOP !== "true",

        maxAge:
          ACCOUNT_RECOVERY_MAX_AGE,

        path:
          "/",
      }
    );

    return clearStateCookie(
      response
    );
  } catch (error) {
    console.error(
      "Google account recovery callback failed:",
      error
    );

    return clearStateCookie(
      recoveryRedirect(
        request,
        "google_failed"
      )
    );
  }
}