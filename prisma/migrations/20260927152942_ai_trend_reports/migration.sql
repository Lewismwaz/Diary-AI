-- CreateTable
CREATE TABLE "AITrendReport" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "period" VARCHAR(10) NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "synthesis" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AITrendReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AITrendReport_userId_idx" ON "AITrendReport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AITrendReport_userId_period_key" ON "AITrendReport"("userId", "period");

-- AddForeignKey
ALTER TABLE "AITrendReport" ADD CONSTRAINT "AITrendReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
