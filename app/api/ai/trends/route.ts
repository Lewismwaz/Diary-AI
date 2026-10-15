import {
  NextResponse,
} from "next/server";

import {
  trendPeriodSchema,
} from "@/domain/ai/diary-trends.schema";

import {
  getAuthenticatedUserId,
} from "@/lib/auth-user";

import {
  diaryTrendsService,
} from "@/services/diary-trends.service";

import {
  diaryTrendSynthesisService,
} from "@/lib/diary-trend-synthesis-service";

import {
  getPrivacySettings,
} from "@/services/privacy-settings.service";

export const runtime =
  "nodejs";

export async function GET(
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

    const url =
      new URL(
        request.url
      );

    const periodValidation =
      trendPeriodSchema.safeParse(
        url.searchParams.get(
          "period"
        ) ?? "30d"
      );

    if (
      !periodValidation.success
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid trend period.",
        },
        {
          status: 400,
        }
      );
    }

    const period =
      periodValidation.data;

    const trends =
      await diaryTrendsService
        .getTrends(
          userId,
          period
        );

    const privacySettings =
    await getPrivacySettings(
      userId
    );

    let synthesis = null;
    let synthesisMeta = null;

    const canUseAITrendAnalysis =
      privacySettings
        .allowAIProcessing &&
      privacySettings
        .allowAITrendAnalysis;

    if (canUseAITrendAnalysis) {
      try {
        const synthesisResult =
          await diaryTrendSynthesisService
            .synthesize(
              userId,
              period
            );

        synthesis =
          synthesisResult
            .synthesis;

        synthesisMeta =
          synthesisResult
            .synthesisMeta;
      } catch (error) {
        console.error(
          "Diary trend synthesis failed:",
          error
        );
      }
    }

    return NextResponse.json(
      {
        data: {
          ...trends,
          synthesis,
          synthesisMeta,

          aiSynthesisEnabled:
            canUseAITrendAnalysis,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "GET /api/ai/trends failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to load diary trends.",
      },
      {
        status: 500,
      }
    );
  }
}