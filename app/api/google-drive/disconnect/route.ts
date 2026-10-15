import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  googleDisconnectRequestSchema,
} from "@/domain/backup/google-disconnect.schema";

import {
  GoogleDriveNotConnectedError,
  disconnectGoogleBackupConnection,
} from "@/services/google-backup-connection.service";

export const runtime =
  "nodejs";

export async function POST(
  request: Request
) {
  const userId =
    await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "Authentication required.",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const body =
      await request.json();

    googleDisconnectRequestSchema.parse(
      body
    );
  } catch {
    return NextResponse.json(
      {
        error:
          'Type "DISCONNECT GOOGLE DRIVE" to confirm.',
      },
      {
        status: 400,
      }
    );
  }

  try {
    await disconnectGoogleBackupConnection(
      userId
    );

    return NextResponse.json({
      data: {
        disconnected:
          true,
      },
    });
  } catch (error) {
    if (
      error instanceof
      GoogleDriveNotConnectedError
    ) {
      return NextResponse.json(
        {
          error:
            "Google Drive is already disconnected.",
        },
        {
          status: 409,
        }
      );
    }

    console.error(
      "Google Drive disconnect failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to disconnect Google Drive.",
      },
      {
        status: 500,
      }
    );
  }
}