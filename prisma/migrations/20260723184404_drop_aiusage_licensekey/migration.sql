-- Drop the leftover LTD column on AiUsage (no longer written).
ALTER TABLE "AiUsage" DROP COLUMN IF EXISTS "licenseKey";
