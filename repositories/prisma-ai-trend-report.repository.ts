import type {
  DiaryTrendSynthesis,
  TrendPeriod,
} from "@/domain/ai/diary-trends.schema";

import {
  diaryTrendSynthesisSchema,
} from "@/domain/ai/diary-trends.schema";

import { prisma } from "@/lib/prisma";

import type {
  AITrendReportRepository,
  StoredAITrendReport,
} from "@/repositories/ai-trend-report.repository";

export class PrismaAITrendReportRepository
  implements AITrendReportRepository
{
  async find(
    userId: string,
    period: TrendPeriod
  ): Promise<
    StoredAITrendReport | null
  > {
    const report =
      await prisma.aITrendReport
        .findUnique({
          where: {
            userId_period: {
              userId,
              period,
            },
          },
        });

    if (!report) {
      return null;
    }

    const validation =
      diaryTrendSynthesisSchema
        .safeParse(
          report.synthesis
        );

    if (!validation.success) {
      return null;
    }

    return {
      fingerprint:
        report.fingerprint,

      synthesis:
        validation.data,

      generatedAt:
        report.generatedAt,
    };
  }

  async save(
    userId: string,
    period: TrendPeriod,
    fingerprint: string,
    synthesis:
      DiaryTrendSynthesis
  ): Promise<
    StoredAITrendReport
  > {
    const generatedAt =
      new Date();

    const report =
      await prisma.aITrendReport
        .upsert({
          where: {
            userId_period: {
              userId,
              period,
            },
          },

          create: {
            userId,
            period,
            fingerprint,
            synthesis,
            generatedAt,
          },

          update: {
            fingerprint,
            synthesis,
            generatedAt,
          },
        });

    return {
      fingerprint:
        report.fingerprint,

      synthesis,
      generatedAt:
        report.generatedAt,
    };
  }
}