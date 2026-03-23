"use client";

import { useState } from "react";
import { acceptAnnouncedVisitAction } from "@/app/guard/actions";

export function ManualArrivalConfirmation({
  qrId,
  hasVehicle,
}: {
  qrId: string;
  hasVehicle: boolean;
}) {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);

  return (
    <form action={acceptAnnouncedVisitAction} className="mt-2 grid gap-2">
      <input type="hidden" name="qrId" value={qrId} />
      {!isCaptureOpen ? (
        <button
          type="button"
          onClick={() => setIsCaptureOpen(true)}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          Confirmar llegada manual
        </button>
      ) : null}

      {isCaptureOpen ? (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Foto del ID
          </label>
          <input
            type="file"
            name="idPhoto"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            required
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
          />
          {hasVehicle ? (
            <>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Foto de placa
              </label>
              <input
                type="file"
                name="platePhoto"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                required
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
              />
            </>
          ) : null}
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setIsCaptureOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Guardar entrada manual
            </button>
          </div>
        </>
      ) : null}
    </form>
  );
}
