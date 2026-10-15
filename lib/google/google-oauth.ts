import {
  google,
} from "googleapis";

export const GOOGLE_DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";

export const GOOGLE_IDENTITY_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
] as const;

function getRequiredEnvironmentVariable(
  name: string
): string {
  const value =
    process.env[name];

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}

export function createGoogleOAuthClient() {
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
      "GOOGLE_DRIVE_REDIRECT_URI"
    );

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
}

export function getGoogleAuthorizationUrl(
  state: string
): string {
  const oauthClient =
    createGoogleOAuthClient();

  return oauthClient.generateAuthUrl({
    access_type: "offline",

    scope: [
      ...GOOGLE_IDENTITY_SCOPES,
      GOOGLE_DRIVE_SCOPE,
    ],

    include_granted_scopes: true,

    state,

    /*
     * Diary AI needs a refresh token so
     * future manual backups can access
     * the user's linked Google Drive.
     */
    prompt: "consent",
  });
}

export function getGoogleRecoveryAuthorizationUrl(
  state: string
): string {
  const clientId =
    getRequiredEnvironmentVariable(
      "GOOGLE_CLIENT_ID"
    );

  const clientSecret =
    getRequiredEnvironmentVariable(
      "GOOGLE_CLIENT_SECRET"
    );

  const recoveryRedirectUri =
    getRequiredEnvironmentVariable(
      "GOOGLE_RECOVERY_REDIRECT_URI"
    );

  const oauthClient =
    new google.auth.OAuth2(
      clientId,
      clientSecret,
      recoveryRedirectUri
    );

  return oauthClient.generateAuthUrl({
    access_type: "online",

    scope: [
      ...GOOGLE_IDENTITY_SCOPES,
    ],

    state,

    prompt: "select_account",
  });
}

export function createGoogleRecoveryOAuthClient() {
  const clientId =
    getRequiredEnvironmentVariable(
      "GOOGLE_CLIENT_ID"
    );

  const clientSecret =
    getRequiredEnvironmentVariable(
      "GOOGLE_CLIENT_SECRET"
    );

  const recoveryRedirectUri =
    getRequiredEnvironmentVariable(
      "GOOGLE_RECOVERY_REDIRECT_URI"
    );

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    recoveryRedirectUri
  );
}