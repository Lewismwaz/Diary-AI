-- CreateTable
CREATE TABLE "GoogleBackupConnection" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "googleAccountId" VARCHAR(255) NOT NULL,
    "googleEmail" VARCHAR(320) NOT NULL,
    "encryptedRefreshToken" TEXT NOT NULL,
    "backupGeneration" INTEGER NOT NULL DEFAULT 1,
    "lastBackupAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleBackupConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleBackupFile" (
    "id" UUID NOT NULL,
    "connectionId" UUID NOT NULL,
    "googleFileId" VARCHAR(255) NOT NULL,
    "generation" INTEGER NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "sizeBytes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleBackupFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleBackupConnection_userId_key" ON "GoogleBackupConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleBackupConnection_googleAccountId_key" ON "GoogleBackupConnection"("googleAccountId");

-- CreateIndex
CREATE INDEX "GoogleBackupConnection_googleAccountId_idx" ON "GoogleBackupConnection"("googleAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleBackupFile_googleFileId_key" ON "GoogleBackupFile"("googleFileId");

-- CreateIndex
CREATE INDEX "GoogleBackupFile_connectionId_generation_idx" ON "GoogleBackupFile"("connectionId", "generation");

-- AddForeignKey
ALTER TABLE "GoogleBackupConnection" ADD CONSTRAINT "GoogleBackupConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoogleBackupFile" ADD CONSTRAINT "GoogleBackupFile_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleBackupConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
