-- CreateTable
CREATE TABLE "AccountRecoverySession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountRecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountRecoverySession_tokenHash_key" ON "AccountRecoverySession"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountRecoverySession_userId_idx" ON "AccountRecoverySession"("userId");

-- CreateIndex
CREATE INDEX "AccountRecoverySession_expiresAt_idx" ON "AccountRecoverySession"("expiresAt");

-- AddForeignKey
ALTER TABLE "AccountRecoverySession" ADD CONSTRAINT "AccountRecoverySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
