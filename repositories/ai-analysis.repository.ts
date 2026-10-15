import {
  type AIAnalysis,
  type Prisma,
} from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type SaveAIAnalysisInput = {
  diaryEntryId: string;
  summary: string;
  moodLabel: string | null;
  moodConfidence: number | null;
  topics: string[];
  importantEvents: string[];
  actionItems: string[];
  recommendations: Prisma.InputJsonValue;
  model: string;
  promptVersion: string;
};

export class AIAnalysisRepository {
  async save(
    input: SaveAIAnalysisInput
  ): Promise<AIAnalysis> {
    return prisma.aIAnalysis.upsert({
      where: {
        diaryEntryId:
          input.diaryEntryId,
      },

      create: {
        diaryEntryId:
          input.diaryEntryId,

        summary:
          input.summary,

        moodLabel:
          input.moodLabel,

        moodConfidence:
          input.moodConfidence,

        topics:
          input.topics,

        importantEvents:
          input.importantEvents,

        actionItems:
          input.actionItems,

        recommendations:
          input.recommendations,

        model:
          input.model,

        promptVersion:
          input.promptVersion,
      },

      update: {
        summary:
          input.summary,

        moodLabel:
          input.moodLabel,

        moodConfidence:
          input.moodConfidence,

        topics:
          input.topics,

        importantEvents:
          input.importantEvents,

        actionItems:
          input.actionItems,

        recommendations:
          input.recommendations,

        model:
          input.model,

        promptVersion:
          input.promptVersion,
      },
    });
  }

  async deleteByDiaryEntryId(
    diaryEntryId: string
  ): Promise<void> {
    await prisma.aIAnalysis.deleteMany({
      where: {
        diaryEntryId,
      },
    });
  }

  async findByDiaryEntryId(
    diaryEntryId: string
  ): Promise<AIAnalysis | null> {
    return prisma.aIAnalysis.findUnique({
      where: {
        diaryEntryId,
      },
    });
  }
}

