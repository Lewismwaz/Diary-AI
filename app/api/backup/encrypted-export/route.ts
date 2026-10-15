import {
  NextResponse,
} from "next/server";

import {
  encryptedBackupRequestSchema,
} from "@/domain/backup/backup-request.schema";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  encryptDiaryBackup,
} from "@/lib/backup/backup-crypto";

import {
  BackupAccountNotFoundError,
  createDiaryBackup,
} from "@/services/diary-backup.service";

export const runtime =
  "nodejs";

export async function POST(
  request: Request
) {
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

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid backup request.",
        },
        {
          status: 400,
        }
      );
    }

    const validation =
      encryptedBackupRequestSchema
        .safeParse(
          body
        );

    if (
      !validation.success
    ) {
      return NextResponse.json(
        {
          error:
            validation.error
              .issues[0]
              ?.message ??
            "Invalid backup passphrase.",
        },
        {
          status: 400,
        }
      );
    }

    const backup =
      await createDiaryBackup(
        userId
      );

    const encryptedBackup =
      await encryptDiaryBackup(
        backup,
        validation.data
          .passphrase
      );

    const date =
      new Date()
        .toISOString()
        .slice(0, 10);

    const filename =
      `diary-ai-backup-${date}.diarybackup`;

    return new Response(
      JSON.stringify(
        encryptedBackup
      ),
      {
        status: 200,

        headers: {
          "Content-Type":
            "application/octet-stream",

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
      "POST /api/backup/encrypted-export failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to create encrypted diary backup.",
      },
      {
        status: 500,
      }
    );
  }
}