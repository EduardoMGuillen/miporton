"use client";

import { useState, type ComponentProps } from "react";
import { EditZoneReservationForm } from "@/app/resident/edit-zone-reservation-form";

type EditModalProps = ComponentProps<typeof EditZoneReservationForm>;

export function EditZoneReservationModal(props: EditModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 transition hover:bg-amber-100"
      >
        Editar reserva
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-10 sm:items-center sm:pt-4"
          role="presentation"
          onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="max-h-[min(85vh,720px)] overflow-y-auto overflow-x-hidden px-4 pb-4 pt-3">
              <EditZoneReservationForm {...props} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
