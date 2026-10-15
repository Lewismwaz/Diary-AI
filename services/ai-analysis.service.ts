import {
  type AIAnalysis,
} from "@/generated/prisma/client";

import {
  analyzeDiaryContent,
} from "@/lib/cohere";

import {
  AIAnalysisRepository,
} from "@/repositories/ai-analysis.repository";

const AI_MODEL =
  "command-a-plus-05-2026";

const PROMPT_VERSION =
  "diary-analysis-v1";

export class AIAnalysisService {
  constructor(
    private readonly repository =
      new AIAnalysisRepository()
  ) {}

  async analyzeAndSave(
    diaryEntryId: string,
    content: string
  ): Promise<AIAnalysis> {
    /*
     * First obtain and validate the
     * structured AI result.
     */
    const analysis =
      await analyzeDiaryContent(
        content
      );

    /*
     * Only persist after the AI
     * response has passed Zod
     * validation.
     */
    return this.repository.save({
      diaryEntryId,

      summary:
        analysis.summary,

      moodLabel:
        analysis.moodLabel,

      moodConfidence:
        analysis.moodConfidence,

      topics:
        analysis.topics,

      importantEvents:
        analysis.importantEvents,

      actionItems:
        analysis.actionItems,

      /*
       * Prisma column is Json because
       * recommendations may evolve
       * into richer objects later.
       */
      recommendations:
        analysis.recommendations,

      model:
        AI_MODEL,

      promptVersion:
        PROMPT_VERSION,
    });
  }

  async deleteForEntry(
    diaryEntryId: string
  ): Promise<void> {
    await this.repository
      .deleteByDiaryEntryId(
        diaryEntryId
      );
  }

  async getForEntry(
    diaryEntryId: string
  ): Promise<AIAnalysis | null> {
    return this.repository
      .findByDiaryEntryId(
        diaryEntryId
      );
  }
}

export const aiAnalysisService =
  new AIAnalysisService();