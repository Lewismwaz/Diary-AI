-- CreateTable
CREATE TABLE "PortableRestoreSession" (
    "id" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "googleAccountId" VARCHAR(255),
    "googleEmail" VARCHAR(320),
    "googleVerifiedAt" TIMESTAMP(3),
    "googleFileId" VARCHAR(255),
    "backupVerifiedAt" TIMESTAMP(3),
    "recoveryEmail" VARCHAR(320),
    "emailVerifiedAt" TIMESTAMP(3),
    "otpHash" VARCHAR(64),
    "otpExpiresAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpSentCount" INTEGER NOT NULL DEFAULT 0,
    "otpLastSentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortableRestoreSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortableRestoreSession_tokenHash_key" ON "PortableRestoreSession"("tokenHash");

-- CreateIndex
CREATE INDEX "PortableRestoreSession_expiresAt_idx" ON "PortableRestoreSession"("expiresAt");

-- CreateIndex
CREATE INDEX "PortableRestoreSession_googleAccountId_idx" ON "PortableRestoreSession"("googleAccountId");
