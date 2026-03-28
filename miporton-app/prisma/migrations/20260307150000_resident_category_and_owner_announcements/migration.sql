DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementTargetMode_new') THEN
    CREATE TYPE "AnnouncementTargetMode_new" AS ENUM ('ALL_RESIDENTS', 'SELECTED_RESIDENTS', 'OWNERS_ONLY');
  END IF;
END$$;

ALTER TABLE "AdminAnnouncement"
  ALTER COLUMN "targetMode" TYPE "AnnouncementTargetMode_new"
  USING ("targetMode"::text::"AnnouncementTargetMode_new");

DROP TYPE "AnnouncementTargetMode";
ALTER TYPE "AnnouncementTargetMode_new" RENAME TO "AnnouncementTargetMode";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResidentCategory') THEN
    CREATE TYPE "ResidentCategory" AS ENUM ('OWNER', 'TENANT');
  END IF;
END$$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "residentCategory" "ResidentCategory" NOT NULL DEFAULT 'OWNER';

UPDATE "User"
SET "residentCategory" = 'OWNER'
WHERE "residentCategory" IS NULL;
