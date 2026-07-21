-- CreateEnum
CREATE TYPE "BillingMethod" AS ENUM ('MONTHLY', 'FULL_TERM');

-- CreateEnum
CREATE TYPE "FeeStatus" AS ENUM ('UNPAID', 'PAID');

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "billingMethod" "BillingMethod",
ADD COLUMN     "feePerSession" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "BatchStudent" ADD COLUMN     "removedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "FeePeriod" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFee" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "feePeriodId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "FeeStatus" NOT NULL DEFAULT 'UNPAID',
    "paidAt" TIMESTAMP(3),
    "paymentNote" TEXT,
    "markedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeePeriod_businessId_periodStart_idx" ON "FeePeriod"("businessId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "FeePeriod_batchId_periodStart_periodEnd_key" ON "FeePeriod"("batchId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "StudentFee_businessId_status_dueDate_idx" ON "StudentFee"("businessId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "StudentFee_studentId_idx" ON "StudentFee"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFee_feePeriodId_studentId_key" ON "StudentFee"("feePeriodId", "studentId");

-- AddForeignKey
ALTER TABLE "FeePeriod" ADD CONSTRAINT "FeePeriod_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePeriod" ADD CONSTRAINT "FeePeriod_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_feePeriodId_fkey" FOREIGN KEY ("feePeriodId") REFERENCES "FeePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
