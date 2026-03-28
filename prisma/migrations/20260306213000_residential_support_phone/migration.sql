-- Add support phone for residential WhatsApp support link
ALTER TABLE "Residential"
ADD COLUMN IF NOT EXISTS "supportPhone" TEXT;
