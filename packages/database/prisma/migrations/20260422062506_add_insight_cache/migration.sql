-- CreateTable
CREATE TABLE "MonthlyInsightCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonthlyInsightCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthlyInsightCache_userId_idx" ON "MonthlyInsightCache"("userId");

-- CreateIndex
CREATE INDEX "MonthlyInsightCache_cachedAt_idx" ON "MonthlyInsightCache"("cachedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyInsightCache_userId_month_year_key" ON "MonthlyInsightCache"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "MonthlyInsightCache" ADD CONSTRAINT "MonthlyInsightCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
