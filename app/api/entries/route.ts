import { NextResponse } from "next/server";

import { createDiaryEntrySchema } from "@/domain/diary/diary-entry.schema";
import { diaryService } from "@/lib/diary-service";
import { getAuthenticatedUserId } from "@/lib/auth-user";

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown server error";
}

export async function GET() {
  try {
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const entries =
      await diaryService.listEntries(
        userId
      );

    return NextResponse.json(
      {
        data: entries,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/entries failed:",
      getErrorMessage(error)
    );

    return NextResponse.json(
      {
        error:
          "Unable to load diary entries.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    /*
     * Authenticate before doing database work.
     */
    const userId =
      await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        {
          error: "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "The request body must contain valid JSON.",
        },
        {
          status: 400,
        }
      );
    }

    const validation =
      createDiaryEntrySchema.safeParse(
        body
      );

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid diary entry.",
          issues:
            validation.error.issues,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * userId comes from the authenticated
     * server-side session.
     *
     * NEVER accept userId from request.body.
     */
    const entry =
      await diaryService.createEntry(
        userId,
        validation.data
      );

    return NextResponse.json(
      {
        data: entry,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/entries failed:",
      getErrorMessage(error)
    );

    return NextResponse.json(
      {
        error:
          "Unable to save diary entry.",
      },
      {
        status: 500,
      }
    );
  }
}