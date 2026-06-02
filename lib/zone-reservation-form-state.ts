export type ZoneReservationDetailPayload = {
  residentialName?: string;
  zoneName: string;
  startsAtIso: string;
  endsAtIso: string;
  note: string | null;
};

export type ZoneReservationActionState =
  | null
  | { ok: false; message: string; conflict?: "occupied" | "onePerDay" | "dayNotAllowed" }
  | { ok: true; detail: ZoneReservationDetailPayload };

export function zoneReservationError(
  message: string,
  options?: { conflict?: "occupied" | "onePerDay" | "dayNotAllowed" },
): Extract<ZoneReservationActionState, { ok: false }> {
  return { ok: false, message, ...(options?.conflict ? { conflict: options.conflict } : {}) };
}

export function zoneReservationSuccess(
  detail: ZoneReservationDetailPayload,
): Extract<ZoneReservationActionState, { ok: true }> {
  return { ok: true, detail };
}
