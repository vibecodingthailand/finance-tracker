-- AlterEnum: replace TransactionSource values with MANUAL/RECURRING
ALTER TABLE "Transaction" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "source" TYPE TEXT USING "source"::text;
DROP TYPE "TransactionSource";
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'RECURRING');
UPDATE "Transaction" SET "source" = 'MANUAL' WHERE "source" NOT IN ('MANUAL', 'RECURRING');
ALTER TABLE "Transaction" ALTER COLUMN "source" TYPE "TransactionSource" USING "source"::"TransactionSource";
ALTER TABLE "Transaction" ALTER COLUMN "source" SET DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "Recurring" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recurring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recurring_userId_idx" ON "Recurring"("userId");

-- CreateIndex
CREATE INDEX "Recurring_categoryId_idx" ON "Recurring"("categoryId");

-- AddForeignKey
ALTER TABLE "Recurring" ADD CONSTRAINT "Recurring_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recurring" ADD CONSTRAINT "Recurring_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
