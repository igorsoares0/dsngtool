-- CreateTable
CREATE TABLE "AiUsage" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "licenseKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_deviceId_month_key" ON "AiUsage"("deviceId", "month");
