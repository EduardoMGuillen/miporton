BEGIN;

ALTER TABLE "QrScan"
  ADD COLUMN IF NOT EXISTS "exitedAt" TIMESTAMP(3);

ALTER TABLE "QrScan"
  ADD COLUMN IF NOT EXISTS "exitNote" TEXT;

UPDATE "QrScan"
SET
  "exitedAt" = '2026-03-11 23:59:59',
  "exitNote" = 'Salida inicial por migracion (historico previo).'
WHERE "isValid" = true
  AND "exitedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "QrScan_codeId_exitedAt_idx"
  ON "QrScan" ("codeId", "exitedAt");

CREATE INDEX IF NOT EXISTS "QrScan_pending_exit_idx"
  ON "QrScan" ("codeId", "scannedAt")
  WHERE "isValid" = true AND "exitedAt" IS NULL;

COMMIT;
