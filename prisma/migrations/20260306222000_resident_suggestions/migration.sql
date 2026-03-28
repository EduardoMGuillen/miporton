-- Resident suggestions table for residential admins
CREATE TABLE IF NOT EXISTS "ResidentSuggestion" (
  "id" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "residentialId" TEXT NOT NULL,
  "residentId" TEXT NOT NULL,
  CONSTRAINT "ResidentSuggestion_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ResidentSuggestion_residentialId_fkey" FOREIGN KEY ("residentialId") REFERENCES "Residential"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ResidentSuggestion_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ResidentSuggestion_residentialId_createdAt_idx"
ON "ResidentSuggestion"("residentialId", "createdAt");

CREATE INDEX IF NOT EXISTS "ResidentSuggestion_residentId_createdAt_idx"
ON "ResidentSuggestion"("residentId", "createdAt");
