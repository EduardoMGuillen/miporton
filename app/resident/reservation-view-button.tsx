"use client";

import { useState } from "react";
import { ReservationDetailsDialog } from "@/app/resident/reservation-details-dialog";
import type { ZoneReservationDetailPayload } from "@/lib/zone-reservation-form-state";

export function ReservationViewButton({
  residentialName,
  zoneName,
  startsAtIso,
  endsAtIso,
  note,
}: ZoneReservationDetailPayload) {
  const [open, setOpen] = useState(false);
  const detail: ZoneReservationDetailPayload = {
    residentialName,
    zoneName,
    startsAtIso,
    endsAtIso,
    note,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 transition hover:bg-blue-100"
      >
        Ver reserva
      </button>
      <ReservationDetailsDialog
        open={open}
        onClose={() => setOpen(false)}
        detail={detail}
        title="Tu reserva"
      />
    </>
  );
}
