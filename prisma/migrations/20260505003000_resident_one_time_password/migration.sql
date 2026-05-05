ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "oneTimePasswordCipher" TEXT,
  ADD COLUMN IF NOT EXISTS "oneTimePasswordCreatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "oneTimePasswordCreatedById" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_oneTimePasswordCreatedById_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_oneTimePasswordCreatedById_fkey"
      FOREIGN KEY ("oneTimePasswordCreatedById")
      REFERENCES "User"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
