
import { google } from "googleapis";

import {
  GOOGLE_DRIVE_SCOPE,
  GOOGLE_IDENTITY_SCOPES,
} from "@/lib/google/google-oauth";

function getRequiredEnvironmentVariable(
  name: string
): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}

/**
 * Creates a Google OAuth client specifically
 * for signed-out account restoration.
 *
 * This is intentionally separate from the
 * existing Google Drive connection and
 * Forgot Password OAuth clients.
 */
export function createGoogleRestoreOAuthClient() {
  const clientId =
    getRequiredEnvironmentVariable(
      "GOOGLE_CLIENT_ID"
    );

  const clientSecret =
    getRequiredEnvironmentVariable(
      "GOOGLE_CLIENT_SECRET"
    );

  const redirectUri =
    getRequiredEnvironmentVariable(
      "GOOGLE_RESTORE_REDIRECT_URI"
    );

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

/**
 * Request access to Google identity and
 * application-created Drive backup files.
 *
 * A restore session does not require a
 * previously registered local account.
 */
export function getGoogleRestoreAuthorizationUrl(
  state: string
): string {
  const oauthClient =
    createGoogleRestoreOAuthClient();

  return oauthClient.generateAuthUrl({
    access_type: "online",

    scope: [
      ...GOOGLE_IDENTITY_SCOPES,
      GOOGLE_DRIVE_SCOPE,
    ],

    state,

    prompt: "select_account",
  });
}
