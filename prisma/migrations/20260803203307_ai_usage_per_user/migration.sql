-- Re-key the AI quota from a client-supplied device id to the user id.
--
-- Existing rows are keyed by a browser-generated id with no path back to a
-- user, so there is nothing to migrate: they are dropped, and every user starts
-- the current month at zero. That is deliberate — the old counters were not
-- enforceable anyway (a client could mint a new device id per request), so
-- carrying them forward would preserve nothing but noise.
DELETE FROM "AiUsage";

-- DropIndex
DROP INDEX "AiUsage_deviceId_month_key";

-- AlterTable
ALTER TABLE "AiUsage" DROP COLUMN "deviceId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AiUsage_userId_idx" ON "AiUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiUsage_userId_month_key" ON "AiUsage"("userId", "month");

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
