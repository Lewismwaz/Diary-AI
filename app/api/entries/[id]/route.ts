import { NextResponse } from "next/server";

import {
  diaryEntryIdSchema,
  updateDiaryEntrySchema,
} from "@/domain/diary/diary-entry.schema";

import { getAuthenticatedUserId } from "@/lib/auth-user";
import { diaryService } from "@/lib/diary-service";
import {
  aiAnalysisService,
} from "@/services/ai-analysis.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function validateEntryId(id: string) {
  return diaryEntryIdSchema.safeParse(id);
}

function getErrorMessage(
  error: unknown
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown server error";
}

/*
|--------------------------------------------------------------------------
| GET /api/entries/:id
|--------------------------------------------------------------------------
*/
export async function GET(
  _request: Request,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const idValidation =
      validateEntryId(id);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          error: "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    const entry =
      await diaryService.getEntry(
        userId,
        idValidation.data
      );

    if (!entry) {
      return NextResponse.json(
        {
          error: "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        data: entry,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/entries/[id] failed:",
      getErrorMessage(error)
    );

    return NextResponse.json(
      {
        error:
          "Unable to load diary entry.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| PATCH /api/entries/:id
|--------------------------------------------------------------------------
*/
export async function PATCH(
  request: Request,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const idValidation =
      validateEntryId(id);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          error: "Diary entry not found.",
        },
        {
          status: 404,
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
      updateDiaryEntrySchema.safeParse(
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

    const entry =
      await diaryService.updateEntry(
        userId,
        idValidation.data,
        validation.data
      );

    if (!entry) {
      return NextResponse.json(
        {
          error: "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Existing AI insights describe the
     * previous version of the diary.
     *
     * If the diary content changed, those
     * insights are now stale and must not
     * be presented as current.
     */
    if (
      validation.data.cleanedContent !==
      undefined
    ) {
      try {
        await aiAnalysisService
          .deleteForEntry(entry.id);
      } catch (error) {
        console.error(
          "Failed to invalidate stale AI analysis:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        data: entry,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "PATCH /api/entries/[id] failed:",
      getErrorMessage(error)
    );

    return NextResponse.json(
      {
        error:
          "Unable to update diary entry.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| DELETE /api/entries/:id
|--------------------------------------------------------------------------
*/
export async function DELETE(
  _request: Request,
  context: RouteContext
) {
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

    const { id } = await context.params;

    const idValidation =
      validateEntryId(id);

    if (!idValidation.success) {
      return NextResponse.json(
        {
          error: "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    const deleted =
      await diaryService.deleteEntry(
        userId,
        idValidation.data
      );

    if (!deleted) {
      return NextResponse.json(
        {
          error: "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      {
        message:
          "Diary entry deleted successfully.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "DELETE /api/entries/[id] failed:",
      getErrorMessage(error)
    );

    return NextResponse.json(
      {
        error:
          "Unable to delete diary entry.",
      },
      {
        status: 500,
      }
    );
  }
}
