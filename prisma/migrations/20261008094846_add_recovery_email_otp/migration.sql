-- AlterTable
ALTER TABLE "AccountRecoverySession" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "otpAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpHash" VARCHAR(64),
ADD COLUMN     "otpLastSentAt" TIMESTAMP(3),
ADD COLUMN     "otpSentCount" INTEGER NOT NULL DEFAULT 0;
