import {
  PrismaAITrendReportRepository,
} from "@/repositories/prisma-ai-trend-report.repository";

import {
  DiaryTrendSynthesisService,
} from "@/services/diary-trend-synthesis.service";

const reportRepository =
  new PrismaAITrendReportRepository();

export const diaryTrendSynthesisService =
  new DiaryTrendSynthesisService(
    reportRepository
  );