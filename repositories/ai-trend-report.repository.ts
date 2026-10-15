import type {
  DiaryTrendSynthesis,
  TrendPeriod,
} from "@/domain/ai/diary-trends.schema";

export type StoredAITrendReport = {
  fingerprint: string;

  synthesis:
    DiaryTrendSynthesis;

  generatedAt: Date;
};

export interface AITrendReportRepository {
  find(
    userId: string,
    period: TrendPeriod
  ): Promise<
    StoredAITrendReport | null
  >;

  save(
    userId: string,
    period: TrendPeriod,
    fingerprint: string,
    synthesis:
      DiaryTrendSynthesis
  ): Promise<
    StoredAITrendReport
  >;
}