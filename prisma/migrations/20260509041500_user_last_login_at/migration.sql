-- Add login activity timestamp for active-user metrics.
ALTER TABLE "User"
ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE INDEX "User_residentialId_lastLoginAt_idx"
ON "User"("residentialId", "lastLoginAt");
