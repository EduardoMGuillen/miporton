"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatLongDateTegucigalpa,
  formatTimeTegucigalpa,
} from "@/lib/datetime";
import type {
  ZoneReservationActionState,
  ZoneReservationDetailPayload,
} from "@/lib/zone-reservation-form-state";
import { useResidentT } from "@/app/resident/resident-i18n-context";

function capitalizeSentence(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function ReservationDetailsDialog({
  open,
  onClose,
  detail,
  title,
}: {
  open: boolean;
  onClose: () => void;
  detail: ZoneReservationDetailPayload | null;
  title: string;
}) {
  const { t } = useResidentT();
  if (!open || !detail) return null;

  const durationMs = new Date(detail.endsAtIso).getTime() - new Date(detail.startsAtIso).getTime();
  const durationHours = Math.round(durationMs / (1000 * 60 * 60));

  const dateLine = capitalizeSentence(formatLongDateTegucigalpa(detail.startsAtIso));
  const startTime = formatTimeTegucigalpa(detail.startsAtIso);
  const endTime = formatTimeTegucigalpa(detail.endsAtIso);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reservation-details-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border-2 border-slate-300 bg-white p-6 shadow-2xl">
        <h2 id="reservation-details-title" className="text-center text-xl font-bold text-slate-900">
          {title}
        </h2>
        {detail.residentialName ? (
          <p className="mt-2 text-center text-sm font-medium text-slate-600">{detail.residentialName}</p>
        ) : null}

        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">{t("res.detail.zoneBooked")}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{detail.zoneName}</p>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{t("res.detail.date")}</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{dateLine}</p>
        </div>

        <div className="mt-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/90 p-5">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-emerald-900">
            {t("res.detail.schedule")}
          </p>
          <p className="mt-3 text-center text-2xl font-bold leading-snug text-emerald-950 sm:text-3xl">
            {startTime}
          </p>
          <p className="mt-1 text-center text-sm font-medium text-emerald-800">{t("res.detail.until")}</p>
          <p className="mt-1 text-center text-2xl font-bold leading-snug text-emerald-950 sm:text-3xl">
            {endTime}
          </p>
          <p className="mt-4 text-center text-sm text-emerald-900">
            {t("res.detail.duration")}:{" "}
            <span className="font-semibold">
              {durationHours === 1
                ? t("res.detail.durationHours", { n: durationHours })
                : t("res.detail.durationHoursPlural", { n: durationHours })}
            </span>
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <p className="font-semibold text-slate-700">{t("res.detail.ref")}</p>
          <p className="mt-1 break-words">
            {t("res.detail.refLine", { start: startTime, end: endTime, date: dateLine })}
          </p>
        </div>

        {detail.note ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">{t("res.detail.note")}</p>
            <p className="mt-1 text-sm text-amber-950">{detail.note}</p>
          </div>
        ) : null}

        <p className="mt-5 text-center text-[11px] text-slate-500">{t("res.detail.footer")}</p>

        <button type="button" className="btn-primary mt-5 w-full" onClick={onClose}>
          {t("res.detail.close")}
        </button>
      </div>
    </div>
  );
}

/** Se abre sola tras crear o guardar una reserva con éxito (para captura). */
export function ReservationSuccessDetailDialog({
  state,
  isPending,
  title,
}: {
  state: ZoneReservationActionState;
  isPending: boolean;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const prevPendingRef = useRef(false);

  useEffect(() => {
    const finished = prevPendingRef.current && !isPending;
    prevPendingRef.current = isPending;
    if (finished && state?.ok === true) {
      queueMicrotask(() => setOpen(true));
    }
  }, [isPending, state]);

  useEffect(() => {
    if (!state || state.ok !== true) {
      queueMicrotask(() => setOpen(false));
    }
  }, [state]);

  const detail = state?.ok === true ? state.detail : null;

  return (
    <ReservationDetailsDialog
      open={open && detail !== null}
      onClose={() => setOpen(false)}
      detail={detail}
      title={title}
    />
  );
}
