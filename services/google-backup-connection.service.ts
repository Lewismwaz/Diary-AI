import {
  prisma,
} from "@/lib/prisma";

import {
  encryptGoogleToken,
} from "@/lib/google/google-token-crypto";

import {
  createGoogleOAuthClient,
} from "@/lib/google/google-oauth";

import {
  decryptGoogleToken,
} from "@/lib/google/google-token-crypto";

type SaveGoogleBackupConnectionInput = {
  userId: string;
  googleAccountId: string;
  googleEmail: string;
  refreshToken: string | null;
};

export class GoogleAccountAlreadyLinkedError
  extends Error {
  constructor() {
    super(
      "This Google account is already linked to another Diary AI account."
    );

    this.name =
      "GoogleAccountAlreadyLinkedError";
  }
}

export class GoogleRefreshTokenRequiredError
  extends Error {
  constructor() {
    super(
      "Google did not provide a refresh token."
    );

    this.name =
      "GoogleRefreshTokenRequiredError";
  }
}

export class GoogleDriveNotConnectedError
  extends Error {
  constructor() {
    super(
      "Google Drive is not connected."
    );

    this.name =
      "GoogleDriveNotConnectedError";
  }
}

export async function disconnectGoogleBackupConnection(
  userId: string
): Promise<void> {
  const connection =
    await prisma.googleBackupConnection.findUnique({
      where: {
        userId,
      },

      select: {
        id: true,
        encryptedRefreshToken: true,
      },
    });

  if (!connection) {
    throw new GoogleDriveNotConnectedError();
  }

  /*
   * Revocation is best-effort.
   *
   * The critical security boundary is deleting
   * Diary AI's server-side connection. A Google
   * network/revocation failure must not prevent
   * the user from disconnecting Diary AI.
   */
  try {
    const refreshToken =
      decryptGoogleToken(
        connection.encryptedRefreshToken
      );

    const oauthClient =
      createGoogleOAuthClient();

    await oauthClient.revokeToken(
      refreshToken
    );
  } catch (error) {
    console.warn(
      "Google token revocation failed during disconnect:",
      error
    );
  }

  /*
   * GoogleBackupFile rows cascade-delete through
   * GoogleBackupConnection.
   *
   * The actual encrypted files in Google Drive
   * deliberately remain untouched.
   */
  await prisma.googleBackupConnection.delete({
    where: {
      id:
        connection.id,
    },
  });
}

export async function saveGoogleBackupConnection(
  input: SaveGoogleBackupConnectionInput
) {
  const {
    userId,
    googleAccountId,
    googleEmail,
    refreshToken,
  } = input;

  const existingByGoogleAccount =
    await prisma.googleBackupConnection.findUnique({
      where: {
        googleAccountId,
      },
    });

  if (
    existingByGoogleAccount &&
    existingByGoogleAccount.userId !==
      userId
  ) {
    throw new GoogleAccountAlreadyLinkedError();
  }

  const existingByUser =
    await prisma.googleBackupConnection.findUnique({
      where: {
        userId,
      },
    });

  /*
   * Google does not necessarily issue a new
   * refresh token on every authorization.
   *
   * If this is the user's first connection,
   * however, Diary AI requires one.
   */
  if (
    !refreshToken &&
    !existingByUser
  ) {
    throw new GoogleRefreshTokenRequiredError();
  }

  /*
   * If the user is reconnecting the same
   * Google account and Google did not issue
   * a replacement refresh token, preserve
   * the existing encrypted token.
   */
  if (
    existingByUser &&
    existingByUser.googleAccountId ===
      googleAccountId &&
    !refreshToken
  ) {
    return prisma.googleBackupConnection.update({
      where: {
        userId,
      },

      data: {
        googleEmail,
      },
    });
  }

  if (!refreshToken) {
    throw new GoogleRefreshTokenRequiredError();
  }

  const encryptedRefreshToken =
    encryptGoogleToken(
      refreshToken
    );

  /*
   * If this Diary AI user was previously
   * connected to another Google account,
   * we do not silently replace it.
   *
   * Explicit disconnect/switch semantics
   * will be implemented separately.
   */
  if (
    existingByUser &&
    existingByUser.googleAccountId !==
      googleAccountId
  ) {
    throw new Error(
      "Disconnect the existing Google Drive account before connecting a different Google account."
    );
  }

  return prisma.googleBackupConnection.upsert({
    where: {
      userId,
    },

    create: {
      userId,
      googleAccountId,
      googleEmail,
      encryptedRefreshToken,
    },

    update: {
      googleAccountId,
      googleEmail,
      encryptedRefreshToken,
    },
  });
}

export async function getGoogleBackupConnectionStatus(
  userId: string
) {
  const connection =
    await prisma.googleBackupConnection.findUnique({
      where: {
        userId,
      },

      select: {
        googleEmail: true,
        backupGeneration: true,
        lastBackupAt: true,
        createdAt: true,
      },
    });

  if (!connection) {
    return {
      connected: false as const,
    };
  }

  return {
    connected: true as const,
    googleEmail:
      connection.googleEmail,

    backupGeneration:
      connection.backupGeneration,

    lastBackupAt:
      connection.lastBackupAt,

    connectedAt:
      connection.createdAt,
  };
}