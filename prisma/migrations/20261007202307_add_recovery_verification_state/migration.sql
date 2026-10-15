-- AlterTable
ALTER TABLE "AccountRecoverySession" ADD COLUMN     "backupVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "googleVerifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
