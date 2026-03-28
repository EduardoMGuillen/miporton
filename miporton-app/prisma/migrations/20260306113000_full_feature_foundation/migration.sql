-- Core feature foundation query pack
-- Includes: zones/reservations, announcements, delivery log, contracts, QR upgrades, user house number, 60-day retention readiness.

-- Enums
ALTER TYPE "QrValidity" ADD VALUE IF NOT EXISTS 'INFINITE';
CREATE TYPE "AnnouncementTargetMode" AS ENUM ('ALL_RESIDENTS', 'SELECTED_RESIDENTS');
CREATE TYPE "ZoneReservationStatus" AS ENUM ('APPROVED', 'CANCELLED');

-- User upgrades
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "houseNumber" TEXT;

-- QR upgrades
ALTER TABLE "QrCode"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "hasVehicle" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "QrScan"
ADD COLUMN IF NOT EXISTS "platePhotoData" BYTEA,
ADD COLUMN IF NOT EXISTS "platePhotoMimeType" TEXT,
ADD COLUMN IF NOT EXISTS "platePhotoSize" INTEGER;

-- Zones
CREATE TABLE IF NOT EXISTS "Zone" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "maxHoursPerReservation" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "residentialId" TEXT NOT NULL,
  CONSTRAINT "Zone_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Zone_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Zone_residentialId_name_key" ON "Zone"("residentialId", "name");

-- Zone reservations
CREATE TABLE IF NOT EXISTS "ZoneReservation" (
  "id" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "status" "ZoneReservationStatus" NOT NULL DEFAULT 'APPROVED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "zoneId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  "residentialId" TEXT NOT NULL,
  CONSTRAINT "ZoneReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZoneReservation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZoneReservation_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZoneReservation_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ZoneReservation_zoneId_startsAt_endsAt_idx" ON "ZoneReservation"("zoneId", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "ZoneReservation_residentialId_startsAt_endsAt_idx" ON "ZoneReservation"("residentialId", "startsAt", "endsAt");

-- Zone blocks
CREATE TABLE IF NOT EXISTS "ZoneBlock" (
  "id" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "zoneId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "residentialId" TEXT NOT NULL,
  CONSTRAINT "ZoneBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZoneBlock_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZoneBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZoneBlock_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ZoneBlock_zoneId_startsAt_endsAt_idx" ON "ZoneBlock"("zoneId", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "ZoneBlock_residentialId_startsAt_endsAt_idx" ON "ZoneBlock"("residentialId", "startsAt", "endsAt");

-- Delivery log
CREATE TABLE IF NOT EXISTS "DeliveryAnnouncement" (
  "id" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "residentId" TEXT NOT NULL,
  "guardId" TEXT NOT NULL,
  "residentialId" TEXT NOT NULL,
  CONSTRAINT "DeliveryAnnouncement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeliveryAnnouncement_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeliveryAnnouncement_guardId_fkey" FOREIGN KEY ("guardId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DeliveryAnnouncement_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DeliveryAnnouncement_residentialId_createdAt_idx" ON "DeliveryAnnouncement"("residentialId", "createdAt");
CREATE INDEX IF NOT EXISTS "DeliveryAnnouncement_residentId_createdAt_idx" ON "DeliveryAnnouncement"("residentId", "createdAt");

-- Admin announcements
CREATE TABLE IF NOT EXISTS "AdminAnnouncement" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "targetMode" "AnnouncementTargetMode" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "residentialId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "AdminAnnouncement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminAnnouncement_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AdminAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AdminAnnouncement_residentialId_createdAt_idx" ON "AdminAnnouncement"("residentialId", "createdAt");

CREATE TABLE IF NOT EXISTS "AdminAnnouncementRecipient" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "announcementId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAnnouncementRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminAnnouncementRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AdminAnnouncementRecipient_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "AdminAnnouncement"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdminAnnouncementRecipient_userId_announcementId_key" ON "AdminAnnouncementRecipient"("userId", "announcementId");

-- Service contracts
CREATE TABLE IF NOT EXISTS "ServiceContract" (
  "id" TEXT NOT NULL,
  "residentialName" TEXT NOT NULL,
  "legalRepresentative" TEXT NOT NULL,
  "representativeEmail" TEXT NOT NULL,
  "representativePhone" TEXT NOT NULL,
  "servicePlan" TEXT NOT NULL,
  "monthlyAmount" DOUBLE PRECISION NOT NULL,
  "startsOn" TIMESTAMP(3) NOT NULL,
  "endsOn" TIMESTAMP(3),
  "terms" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "residentialId" TEXT,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "ServiceContract_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceContract_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ServiceContract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ServiceContract_createdAt_idx" ON "ServiceContract"("createdAt");
CREATE INDEX IF NOT EXISTS "ServiceContract_residentialId_createdAt_idx" ON "ServiceContract"("residentialId", "createdAt");
