import {
  Readable,
} from "node:stream";

import {
  google,
} from "googleapis";

import {
  prisma,
} from "@/lib/prisma";

import {
  decryptGoogleToken,
} from "@/lib/google/google-token-crypto";

import {
  createGoogleOAuthClient,
} from "@/lib/google/google-oauth";

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

export class GoogleDriveUploadError
  extends Error {
  constructor(
    message =
      "Unable to upload the backup to Google Drive."
  ) {
    super(message);

    this.name =
      "GoogleDriveUploadError";
  }
}

export class GoogleDriveBackupNotFoundError extends Error {
  constructor() {
    super(
      "No Google Drive backup was found for the current backup generation."
    );

    this.name =
      "GoogleDriveBackupNotFoundError";
  }
}

export class GoogleDriveReconnectRequiredError extends Error {
  constructor() {
    super(
      "Google Drive authorization has expired or been revoked. Reconnect Google Drive."
    );

    this.name =
      "GoogleDriveReconnectRequiredError";
  }
}

type UploadEncryptedBackupInput = {
  userId: string;
  filename: string;
  backup: Buffer;
};

export async function uploadEncryptedBackupToGoogleDrive(
  input: UploadEncryptedBackupInput
) {
  const {
    userId,
    filename,
    backup,
  } = input;

  const connection =
    await prisma.googleBackupConnection.findUnique({
      where: {
        userId,
      },
    });

  if (!connection) {
    throw new GoogleDriveNotConnectedError();
  }

  const refreshToken =
    decryptGoogleToken(
      connection.encryptedRefreshToken
    );

  const oauthClient =
    createGoogleOAuthClient();

  oauthClient.setCredentials({
    refresh_token:
      refreshToken,
  });

  const drive =
    google.drive({
      version: "v3",
      auth: oauthClient,
    });

  /*
   * Only the already-encrypted .diarybackup
   * bytes are sent to Google.
   */
  const uploadResponse =
    await drive.files.create({
      requestBody: {
        name:
          filename,

        mimeType:
          "application/octet-stream",
        
        appProperties: {
          diaryAi: "true",
          backupVersion: "2",
          generation: String(
            connection.backupGeneration
          ),
        },

      },

      media: {
        mimeType:
          "application/octet-stream",

        body:
          Readable.from(
            backup
          ),
      },

      fields:
        "id,name,size,createdTime",
    });

  const googleFileId =
    uploadResponse.data.id;

  if (!googleFileId) {
    throw new GoogleDriveUploadError(
      "Google Drive did not return a file ID."
    );
  }

  const sizeBytes =
    backup.byteLength;

  try {
    const backupCreatedAt =
      new Date();

    const result =
      await prisma.$transaction(
        async (tx) => {
          const backupFile =
            await tx.googleBackupFile.create({
              data: {
                connectionId:
                  connection.id,

                googleFileId,

                generation:
                  connection.backupGeneration,

                filename,

                sizeBytes,
              },
            });

          await tx.googleBackupConnection.update({
            where: {
              id:
                connection.id,
            },

            data: {
              lastBackupAt:
                backupCreatedAt,
            },
          });

          return {
            backupFile,
            lastBackupAt:
              backupCreatedAt,
          };
        }
      );

    return {
      googleFileId,
      filename,
      sizeBytes,
      generation:
        connection.backupGeneration,
      lastBackupAt:
        result.lastBackupAt,
    };
  } catch (databaseError) {
    /*
     * Google accepted the file but Diary AI
     * failed to record it.
     *
     * Attempt to remove the orphaned file.
     */
    try {
      await drive.files.delete({
        fileId:
          googleFileId,
      });
    } catch (cleanupError) {
      console.error(
        "Failed to remove orphaned Google Drive backup:",
        cleanupError
      );
    }

    throw databaseError;
  }
}

export async function downloadLatestEncryptedBackupFromGoogleDrive(
  userId: string
) {
  const connection =
    await prisma.googleBackupConnection.findUnique({
      where: {
        userId,
      },
    });

  if (!connection) {
    throw new GoogleDriveNotConnectedError();
  }

  const latestBackup =
    await prisma.googleBackupFile.findFirst({
      where: {
        connectionId:
          connection.id,

        generation:
          connection.backupGeneration,
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  if (!latestBackup) {
    throw new GoogleDriveBackupNotFoundError();
  }

  const refreshToken =
    decryptGoogleToken(
      connection.encryptedRefreshToken
    );

  const oauthClient =
    createGoogleOAuthClient();

  oauthClient.setCredentials({
    refresh_token:
      refreshToken,
  });

  const drive =
    google.drive({
      version: "v3",
      auth: oauthClient,
    });

  try {
    const response =
      await drive.files.get(
        {
          fileId:
            latestBackup.googleFileId,

          alt:
            "media",
        },

        {
          responseType:
            "arraybuffer",
        }
      );

    const backupBuffer =
      Buffer.from(
        response.data as ArrayBuffer
      );

    return {
      backup:
        backupBuffer,

      filename:
        latestBackup.filename,

      generation:
        latestBackup.generation,

      createdAt:
        latestBackup.createdAt,

      sizeBytes:
        latestBackup.sizeBytes,
    };
  } catch (error) {
    console.error(
      "Unable to download Google Drive backup:",
      error
    );

    throw new GoogleDriveUploadError(
      "Unable to download the latest Google Drive backup."
    );
  }
}