import "server-only";

import {
  createHash,
} from "node:crypto";

import type {
  TrendPeriod,
} from "@/domain/ai/diary-trends.schema";

type TrendFingerprintEntry = {
  id: string;
  entryDate: Date;

  aiAnalysis: {
    id: string;
    updatedAt: Date;
  } | null;
};

export function createTrendFingerprint(
  userId: string,
  period: TrendPeriod,
  entries:
    TrendFingerprintEntry[]
) {
  const source =
    entries
      .filter(
        (
          entry
        ): entry is
          TrendFingerprintEntry & {
            aiAnalysis: {
              id: string;
              updatedAt: Date;
            };
          } =>
          entry.aiAnalysis !==
          null
      )
      .map(
        (entry) => ({
          entryId:
            entry.id,

          entryDate:
            entry.entryDate
              .toISOString(),

          analysisId:
            entry.aiAnalysis.id,

          analysisUpdatedAt:
            entry.aiAnalysis
              .updatedAt
              .toISOString(),
        })
      );

  return createHash(
    "sha256"
  )
    .update(
      JSON.stringify({
        userId,
        period,
        source,
      })
    )
    .digest("hex");
}