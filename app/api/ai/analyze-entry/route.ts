import {
  NextResponse,
} from "next/server";

import {
  analyzeDiaryRequestSchema,
} from "@/domain/ai/diary-analysis.schema";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  analyzeDiaryContent,
} from "@/lib/cohere";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

export const runtime = "nodejs";

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

    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const validation =
      analyzeDiaryRequestSchema.safeParse(
        body
      );

    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error
              .issues[0]
              ?.message ??
            "Invalid diary content.",
        },
        {
          status: 400,
        }
      );
    }

    const analysis =
      await analyzeDiaryContent(
        validation.data.content
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
      "POST /api/ai/analyze-entry failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to analyze the diary entry.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      }
    );
  }
}