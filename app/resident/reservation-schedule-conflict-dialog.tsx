"use client";

import { useEffect, useRef, useState } from "react";
import { isZoneReservationTakenByResidentState } from "@/lib/zone-reservation-feedback";
import type { ZoneReservationActionState } from "@/lib/zone-reservation-form-state";
import { useResidentT } from "@/app/resident/resident-i18n-context";

export function ReservationScheduleConflictDialog({
  state,
  isPending,
}: {
  state: ZoneReservationActionState;
  isPending: boolean;
}) {
  const { t } = useResidentT();
  const [open, setOpen] = useState(false);
  const prevPendingRef = useRef(false);

  useEffect(() => {
    const finishedSubmit = prevPendingRef.current && !isPending;
    prevPendingRef.current = isPending;
    if (finishedSubmit && state && isZoneReservationTakenByResidentState(state)) {
      queueMicrotask(() => setOpen(true));
    }
  }, [isPending, state]);

  useEffect(() => {
    if (state?.ok === true) {
      queueMicrotask(() => setOpen(false));
    }
  }, [state]);

  if (!open || state?.ok !== false) return null;

  const isOnePerDay = state.conflict === "onePerDay";
  const isWeekdayBlocked = state.conflict === "dayNotAllowed";

  const titleKey = isWeekdayBlocked
    ? "res.conflict.weekdayTitle"
    : isOnePerDay
      ? "res.conflict.dayTitle"
      : "res.conflict.slotTitle";
  const bodyKey = isWeekdayBlocked
    ? "res.conflict.weekdayBody"
    : isOnePerDay
      ? "res.conflict.dayBody"
      : "res.conflict.slotBody";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="reservation-conflict-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h3 id="reservation-conflict-title" className="text-lg font-semibold text-slate-900">
          {t(titleKey)}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(bodyKey)}</p>
        <button type="button" className="btn-primary mt-6 w-full" onClick={() => setOpen(false)}>
          {t("res.conflict.ok")}
        </button>
      </div>
    </div>
  );
}
