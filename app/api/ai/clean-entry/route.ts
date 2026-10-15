import {
  NextResponse,
} from "next/server";

import {
  cleanDiaryRequestSchema,
} from "@/domain/ai/diary-cleaning.schema";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  cleanDiaryContent,
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
      cleanDiaryRequestSchema.safeParse(
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

    const result =
      await cleanDiaryContent(
        validation.data.content
      );

    return NextResponse.json(
      {
        data: result,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/ai/clean-entry failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Unable to clean the diary entry.";

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