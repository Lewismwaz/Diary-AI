import {
  prisma,
} from "@/lib/prisma";

export type TrendEntry =
  Awaited<
    ReturnType<
      DiaryTrendsRepository["listForPeriod"]
    >
  >[number];

export class DiaryTrendsRepository {
  async listForPeriod(
    userId: string,
    startDate: Date
  ) {
    return prisma.diaryEntry.findMany({
      where: {
        userId,

        entryDate: {
          gte: startDate,
        },
      },

      select: {
        id: true,
        entryDate: true,

        aiAnalysis: {
          select: {
            id: true,
            updatedAt: true,

            summary: true,
            moodLabel: true,
            moodConfidence: true,
            topics: true,
            importantEvents: true,
            actionItems: true,
          },
        },
      },

      orderBy: {
        entryDate: "asc",
      },
    });
  }
}

export const diaryTrendsRepository =
  new DiaryTrendsRepository();