import {
  z,
} from "zod";

export const privacySettingsSchema =
  z.object({
    allowVoiceTranscription:
      z.boolean(),

    allowAIProcessing:
      z.boolean(),

    allowAITrendAnalysis:
      z.boolean(),
  });

export type PrivacySettingsInput =
  z.infer<
    typeof privacySettingsSchema
  >;