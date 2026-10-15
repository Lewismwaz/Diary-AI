import {
  prisma,
} from "@/lib/prisma";

export type PrivacySettings = {
  allowVoiceTranscription: boolean;
  allowAIProcessing: boolean;
  allowAITrendAnalysis: boolean;
};

const DEFAULT_PRIVACY_SETTINGS:
  PrivacySettings = {
    allowVoiceTranscription: true,
    allowAIProcessing: true,
    allowAITrendAnalysis: true,
  };

export async function getPrivacySettings(
  userId: string
): Promise<PrivacySettings> {
  const settings =
    await prisma.privacySettings.findUnique({
      where: {
        userId,
      },

      select: {
        allowVoiceTranscription:
          true,

        allowAIProcessing:
          true,

        allowAITrendAnalysis:
          true,
      },
    });

  return (
    settings ??
    DEFAULT_PRIVACY_SETTINGS
  );
}

export async function updatePrivacySettings(
  userId: string,
  settings: PrivacySettings
): Promise<PrivacySettings> {
  return prisma.privacySettings.upsert({
    where: {
      userId,
    },

    create: {
      userId,
      ...settings,
    },

    update: {
      ...settings,
    },

    select: {
      allowVoiceTranscription:
        true,

      allowAIProcessing:
        true,

      allowAITrendAnalysis:
        true,
    },
  });
}