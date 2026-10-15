-- CreateTable
CREATE TABLE "PrivacySettings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "allowVoiceTranscription" BOOLEAN NOT NULL DEFAULT true,
    "allowAIProcessing" BOOLEAN NOT NULL DEFAULT true,
    "allowAITrendAnalysis" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivacySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrivacySettings_userId_key" ON "PrivacySettings"("userId");

-- AddForeignKey
ALTER TABLE "PrivacySettings" ADD CONSTRAINT "PrivacySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
