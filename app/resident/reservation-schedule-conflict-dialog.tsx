"use client";

import { useEffect, useRef, useState } from "react";
import {
  ZONE_ONE_RESERVATION_PER_DAY_TAKEN,
  ZONE_RESERVATION_OCCUPIED_BY_RESIDENT,
} from "@/lib/zone-reservation-feedback";
import type { ZoneReservationActionState } from "@/lib/zone-reservation-form-state";

export function ReservationScheduleConflictDialog({
  state,
  isPending,
}: {
  state: ZoneReservationActionState;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const prevPendingRef = useRef(false);

  useEffect(() => {
    const finishedSubmit = prevPendingRef.current && !isPending;
    prevPendingRef.current = isPending;
    const message = state?.ok === false ? state.message : null;
    if (
      finishedSubmit &&
      message &&
      (message === ZONE_RESERVATION_OCCUPIED_BY_RESIDENT ||
        message === ZONE_ONE_RESERVATION_PER_DAY_TAKEN)
    ) {
      setOpen(true);
    }
  }, [isPending, state]);

  useEffect(() => {
    if (state?.ok === true) {
      setOpen(false);
    }
  }, [state]);

  if (!open) return null;

  const message = state?.ok === false ? state.message : null;
  const isDayMessage = message === ZONE_ONE_RESERVATION_PER_DAY_TAKEN;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reservation-conflict-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 id="reservation-conflict-title" className="text-lg font-semibold text-slate-900">
          {isDayMessage ? "Día no disponible" : "Horario no disponible"}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {isDayMessage
            ? "Esta zona solo permite una reserva por día y esa fecha ya está ocupada por otro residente. Por favor elige otra fecha."
            : "Este horario ya está reservado por otro residente. Por favor elige otra fecha u hora."}
        </p>
        <button type="button" className="btn-primary mt-6 w-full" onClick={() => setOpen(false)}>
          Entendido
        </button>
      </div>
    </div>
  );
}
