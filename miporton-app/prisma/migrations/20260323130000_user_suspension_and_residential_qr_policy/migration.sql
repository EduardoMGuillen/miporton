-- Add user suspension controls with safe defaults.
ALTER TABLE "User"
ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- Add residential policy flags for resident QR validity options.
ALTER TABLE "Residential"
ADD COLUMN "allowResidentQrSingleUse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowResidentQrOneDay" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowResidentQrThreeDays" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "allowResidentQrInfinite" BOOLEAN NOT NULL DEFAULT true;
