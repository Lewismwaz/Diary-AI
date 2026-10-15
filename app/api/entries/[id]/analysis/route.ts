import {
  NextResponse,
} from "next/server";

import {
  diaryEntryIdSchema,
} from "@/domain/diary/diary-entry.schema";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  aiAnalysisService,
} from "@/services/ai-analysis.service";

import {
  diaryService,
} from "@/lib/diary-service";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } =
      await context.params;

    const idValidation =
      diaryEntryIdSchema.safeParse(
        id
      );

    if (!idValidation.success) {
      return NextResponse.json(
        {
          error:
            "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Establish ownership before
     * exposing AI analysis.
     */
    const entry =
      await diaryService.getEntry(
        userId,
        idValidation.data
      );

    if (!entry) {
      return NextResponse.json(
        {
          error:
            "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    const analysis =
      await aiAnalysisService
        .getForEntry(entry.id);

    return NextResponse.json(
      {
        data: analysis,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET entry analysis failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load diary analysis.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(
  _request: Request,
  context: RouteContext
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

    const privacySettings =
      await getPrivacySettings(
        userId
      );

    if (
      !privacySettings
        .allowAIProcessing
    ) {
      return NextResponse.json(
        {
          error:
            "AI diary processing is disabled in your Privacy & AI settings.",
          code:
            "AI_PROCESSING_DISABLED",
        },
        {
          status: 403,
        }
      );
    }

    const { id } =
      await context.params;

    const idValidation =
      diaryEntryIdSchema.safeParse(
        id
      );

    if (!idValidation.success) {
      return NextResponse.json(
        {
          error:
            "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Critical security boundary:
     *
     * Retrieve the entry using BOTH
     * its ID and authenticated owner.
     */
    const entry =
      await diaryService.getEntry(
        userId,
        idValidation.data
      );

    if (!entry) {
      return NextResponse.json(
        {
          error:
            "Diary entry not found.",
        },
        {
          status: 404,
        }
      );
    }

    const analysis =
      await aiAnalysisService
        .analyzeAndSave(
          entry.id,
          entry.cleanedContent
        );

    return NextResponse.json(
      {
        data: analysis,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "POST entry analysis failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to analyze the diary entry.",
      },
      {
        status: 500,
      }
    );
  }
}