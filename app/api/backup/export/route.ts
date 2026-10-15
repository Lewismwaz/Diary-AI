import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  BackupAccountNotFoundError,
  createDiaryBackup,
} from "@/services/diary-backup.service";

export const runtime =
  "nodejs";

export async function GET() {
  try {
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

    const backup =
      await createDiaryBackup(
        userId
      );

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    const filename =
      `diary-ai-backup-${date}.json`;

    return new Response(
      JSON.stringify(
        backup,
        null,
        2
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/json; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="${filename}"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    if (
      error instanceof
      BackupAccountNotFoundError
    ) {
      return NextResponse.json(
        {
          error:
            "Account not found.",
        },
        {
          status: 404,
        }
      );
    }

    console.error(
      "GET /api/backup/export failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create diary backup.",
      },
      {
        status: 500,
      }
    );
  }
}