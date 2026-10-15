import { z } from "zod";

export const diaryAnalysisSchema = z.object({
  summary: z.string().min(1),
  mood: z.object({
    label: z.string().min(1),
    confidence: z.number().min(0).max(1),
  }),
  topics: z.array(z.string()).max(20),
  importantEvents: z.array(z.string()).max(20),
  actionItems: z.array(z.string()).max(20),
  recommendations: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ).max(10),
});

export type DiaryAnalysis = z.infer<typeof diaryAnalysisSchema>;
