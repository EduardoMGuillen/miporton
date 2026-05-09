"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { cancelZoneReservationAction } from "@/app/resident/actions";
import { EditZoneReservationForm } from "@/app/resident/edit-zone-reservation-form";
import { ReservationDetailsDialog } from "@/app/resident/reservation-details-dialog";
import type { ZoneReservationDetailPayload } from "@/lib/zone-reservation-form-state";

function CancelReservationSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-75"
    >
      <span className={pending ? "inline-block animate-pulse" : ""}>
        {pending ? "Cancelando..." : "Sí, cancelar"}
      </span>
    </button>
  );
}

function CancelReservationDialog({ reservationId }: { reservationId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
      >
        Cancelar reserva
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cancel-reservation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="cancel-reservation-title" className="text-base font-semibold text-slate-900">
              ¿Seguro que quieres cancelar?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              La reserva se anulará y no podrás recuperarla desde aquí.
            </p>
            <form action={cancelZoneReservationAction} className="mt-5 flex flex-wrap justify-end gap-2">
              <input type="hidden" name="reservationId" value={reservationId} />
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                No, volver
              </button>
              <CancelReservationSubmitButton />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ReservationRowActions({
  residentialName,
  reservationId,
  zoneId,
  zoneName,
  startsAtIso,
  endsAtIso,
  note,
  zone,
  occupiedSlots,
}: {
  residentialName?: string;
  reservationId: string;
  zoneId: string;
  zoneName: string;
  startsAtIso: string;
  endsAtIso: string;
  note: string | null;
  zone: {
    maxHoursPerReservation: number;
    oneReservationPerDay: boolean;
    scheduleStartHour: number;
    scheduleEndHour: number;
  };
  occupiedSlots: Array<{
    zoneId: string;
    startsAtIso: string;
    endsAtIso: string;
    source: "reservation" | "block";
    reservationId?: string;
  }>;
}) {
  const [viewDetail, setViewDetail] = useState<ZoneReservationDetailPayload>(() => ({
    residentialName,
    zoneName,
    startsAtIso,
    endsAtIso,
    note,
  }));
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setViewDetail({
      residentialName,
      zoneName,
      startsAtIso,
      endsAtIso,
      note,
    });
  }, [residentialName, zoneName, startsAtIso, endsAtIso, note]);

  const handleSuccessfulSave = useCallback((detail: ZoneReservationDetailPayload) => {
    setEditOpen(false);
    setViewDetail(detail);
    setViewOpen(true);
  }, []);

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 transition hover:bg-blue-100"
        >
          Ver reserva
        </button>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
        >
          Editar reserva
        </button>
        <CancelReservationDialog reservationId={reservationId} />
      </div>

      <ReservationDetailsDialog
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        detail={viewDetail}
        title="Tu reserva"
      />

      {editOpen ? (
        <div
          className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-10 sm:items-center sm:pt-4"
          role="presentation"
          onClick={() => setEditOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-reservation-title"
            className="relative z-[96] my-auto w-full max-w-lg min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h3 id="edit-reservation-title" className="text-base font-semibold text-slate-900">
                Editar reserva
              </h3>
              <button
                type="button"
                className="rounded-lg p-2 text-lg leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Cerrar"
                onClick={() => setEditOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="max-h-[min(85vh,720px)] overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3">
              <EditZoneReservationForm
                reservationId={reservationId}
                zoneId={zoneId}
                zoneName={zoneName}
                startsAtIso={startsAtIso}
                endsAtIso={endsAtIso}
                note={note}
                zone={zone}
                occupiedSlots={occupiedSlots}
                onSuccessfulSave={handleSuccessfulSave}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
