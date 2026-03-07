-- Reservation notifications support
ALTER TABLE "ZoneReservation"
ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ZoneReservation_status_startsAt_reminderSentAt_idx"
ON "ZoneReservation"("status", "startsAt", "reminderSentAt");
