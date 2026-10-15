-- AlterTable
ALTER TABLE "PortableRestoreSession" ADD COLUMN     "backupDigest" VARCHAR(64),
ADD COLUMN     "backupVerifyAttempts" INTEGER NOT NULL DEFAULT 0;
