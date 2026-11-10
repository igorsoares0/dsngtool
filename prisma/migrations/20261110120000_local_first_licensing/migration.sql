-- Local-first pivot (2026-11-10): designs live on the device, the server only
-- records licenses. Drops every SaaS table (auth, sync, storage, billing, AI
-- quota) — at the time of this migration they held test accounts only.

-- DropForeignKey
ALTER TABLE "AiUsage" DROP CONSTRAINT "AiUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_userId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_userId_fkey";

-- DropForeignKey
ALTER TABLE "session" DROP CONSTRAINT "session_userId_fkey";

-- DropForeignKey
ALTER TABLE "account" DROP CONSTRAINT "account_userId_fkey";

-- DropTable
DROP TABLE "AiUsage";

-- DropTable
DROP TABLE "user";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "Subscription";

-- DropTable
DROP TABLE "Asset";

-- DropTable
DROP TABLE "session";

-- DropTable
DROP TABLE "account";

-- DropTable
DROP TABLE "verification";

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_externalId_key" ON "License"("externalId");

-- CreateIndex
CREATE INDEX "License_email_idx" ON "License"("email");

