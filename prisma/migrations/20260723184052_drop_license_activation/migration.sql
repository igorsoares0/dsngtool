-- Drop the LTD licensing tables (pivot to subscription SaaS). Sandbox-only data.

-- DropForeignKey
ALTER TABLE "Activation" DROP CONSTRAINT IF EXISTS "Activation_licenseId_fkey";

-- DropTable
DROP TABLE IF EXISTS "Activation";
DROP TABLE IF EXISTS "License";

-- DropEnum
DROP TYPE IF EXISTS "LicenseSource";
DROP TYPE IF EXISTS "LicenseStatus";
