export type ZoneReservationDetailPayload = {
  residentialName?: string;
  zoneName: string;
  startsAtIso: string;
  endsAtIso: string;
  note: string | null;
};

export type ZoneReservationActionState =
  | null
  | { ok: false; message: string }
  | { ok: true; detail: ZoneReservationDetailPayload };

export function zoneReservationError(message: string): Extract<ZoneReservationActionState, { ok: false }> {
  return { ok: false, message };
}

export function zoneReservationSuccess(
  detail: ZoneReservationDetailPayload,
): Extract<ZoneReservationActionState, { ok: true }> {
  return { ok: true, detail };
}
