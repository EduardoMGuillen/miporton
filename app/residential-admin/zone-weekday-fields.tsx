"use client";

import { WEEKDAY_LABELS_ES, WEEKDAY_ORDER } from "@/lib/zone-weekdays";

export function ZoneWeekdayFields({
  namePrefix = "reservationDay",
  defaultMask = 127,
}: {
  namePrefix?: string;
  defaultMask?: number;
}) {
  return (
    <div className="md:col-span-2">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Dias habilitados para reservas
      </p>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_ORDER.map((day) => (
          <label
            key={day}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
          >
            <input
              type="checkbox"
              name={`${namePrefix}_${day}`}
              defaultChecked={((defaultMask >> day) & 1) === 1}
              className="h-4 w-4 accent-blue-600"
            />
            {WEEKDAY_LABELS_ES[day]}
          </label>
        ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Desmarca los dias en que no se permiten reservas (ej. fines de semana).
      </p>
    </div>
  );
}
