-- Días de la semana permitidos para reservar (bitmask: bit 0=Dom … 6=Sab). 127 = todos.
ALTER TABLE "Zone"
ADD COLUMN IF NOT EXISTS "reservationWeekdaysMask" INTEGER NOT NULL DEFAULT 127;
