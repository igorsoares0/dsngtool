-- CreateEnum
CREATE TYPE "LicenseSource" AS ENUM ('paddle', 'appsumo');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('active', 'refunded', 'deactivated');

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "source" "LicenseSource" NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'active',
    "tier" TEXT NOT NULL DEFAULT 'pro',
    "email" TEXT,
    "externalId" TEXT NOT NULL,
    "maxActivations" INTEGER NOT NULL DEFAULT 3,
    "activationCount" INTEGER NOT NULL DEFAULT 0,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activation" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "License_key_key" ON "License"("key");

-- CreateIndex
CREATE UNIQUE INDEX "License_externalId_key" ON "License"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Activation_licenseId_deviceId_key" ON "Activation"("licenseId", "deviceId");

-- AddForeignKey
ALTER TABLE "Activation" ADD CONSTRAINT "Activation_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "License"("id") ON DELETE CASCADE ON UPDATE CASCADE;
