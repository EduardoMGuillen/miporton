import type { ZoneReservationActionState } from "@/lib/zone-reservation-form-state";

/** Coincidencia exacta con los returns de las server actions de zona (resident). */

export const ZONE_RESERVATION_OCCUPIED_BY_RESIDENT =
  "Ese horario ya esta reservado.";

export const ZONE_ONE_RESERVATION_PER_DAY_TAKEN =
  "Esta zona permite solo 1 reserva por dia y ya existe una reserva para esa fecha.";

export function isZoneReservationTakenByResidentMessage(message: string | null): boolean {
  if (!message) return false;
  return (
    message === ZONE_RESERVATION_OCCUPIED_BY_RESIDENT ||
    message === ZONE_ONE_RESERVATION_PER_DAY_TAKEN
  );
}

export function isZoneReservationTakenByResidentState(state: ZoneReservationActionState): boolean {
  if (!state || state.ok !== false) return false;
  if (state.conflict === "occupied" || state.conflict === "onePerDay" || state.conflict === "dayNotAllowed") {
    return true;
  }
  return isZoneReservationTakenByResidentMessage(state.message);
}
