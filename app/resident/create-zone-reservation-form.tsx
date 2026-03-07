"use client";

import { useActionState, useMemo, useState } from "react";
import { createZoneReservationAction } from "@/app/resident/actions";

const initialState: string | null = null;

const HOURS = Array.from({ length: 24 }, (_, index) => index);

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatHourLabel(hour: number) {
  return `${pad2(hour)}:00`;
}

function dateOnly(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function overlapRange(
  startsAt: Date,
  endsAt: Date,
  otherStart: Date,
  otherEnd: Date,
) {
  return startsAt < otherEnd && endsAt > otherStart;
}

export function CreateZoneReservationForm({
  zones,
  occupiedSlots,
}: {
  zones: Array<{ id: string; name: string; maxHoursPerReservation: number }>;
  occupiedSlots: Array<{
    zoneId: string;
    startsAtIso: string;
    endsAtIso: string;
    source: "reservation" | "block";
  }>;
}) {
  const [message, formAction, isPending] = useActionState(createZoneReservationAction, initialState);
  const [zoneId, setZoneId] = useState("");
  const [reservationDate, setReservationDate] = useState(dateOnly(new Date()));
  const [startHour, setStartHour] = useState("08");
  const [durationHours, setDurationHours] = useState("1");

  const selectedZone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zones, zoneId]);
  const maxHoursByZone = Math.max(1, selectedZone?.maxHoursPerReservation ?? 1);

  const slotRanges = useMemo(
    () =>
      occupiedSlots
        .filter((slot) => slot.zoneId === zoneId)
        .map((slot) => ({
          source: slot.source,
          startsAt: new Date(slot.startsAtIso),
          endsAt: new Date(slot.endsAtIso),
        })),
    [occupiedSlots, zoneId],
  );

  const occupiedHours = useMemo(() => {
    if (!zoneId || !reservationDate) return new Set<number>();
    const dayStart = new Date(`${reservationDate}T00:00`);
    const set = new Set<number>();
    HOURS.forEach((hour) => {
      const slotStart = new Date(dayStart);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(dayStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      const taken = slotRanges.some((slot) =>
        overlapRange(slotStart, slotEnd, slot.startsAt, slot.endsAt),
      );
      if (taken) set.add(hour);
    });
    return set;
  }, [zoneId, reservationDate, slotRanges]);

  const availableStartHours = useMemo(() => HOURS.filter((hour) => !occupiedHours.has(hour)), [occupiedHours]);
  const selectedStartHourNumberRaw = Number(startHour);
  const effectiveStartHourNumber =
    availableStartHours.length === 0
      ? selectedStartHourNumberRaw
      : availableStartHours.includes(selectedStartHourNumberRaw)
        ? selectedStartHourNumberRaw
        : availableStartHours[0];
  const effectiveStartHour = pad2(effectiveStartHourNumber);
  const remainingHoursInDay = Math.max(1, 24 - effectiveStartHourNumber);
  const maxSelectableDuration = Math.max(1, Math.min(maxHoursByZone, remainingHoursInDay));
  const durationOptions = Array.from({ length: Math.max(1, maxSelectableDuration) }, (_, index) => index + 1);
  const durationRaw = Number(durationHours || "1");
  const effectiveDurationHours = Math.min(Math.max(durationRaw, 1), Math.max(1, maxSelectableDuration));
  const effectiveDurationText = String(effectiveDurationHours);

  const startsAt = `${reservationDate}T${effectiveStartHour}:00`;
  const startDateObject = new Date(startsAt);
  const endsAtDate = new Date(startDateObject);
  endsAtDate.setHours(endsAtDate.getHours() + effectiveDurationHours);
  const endsAt = `${dateOnly(endsAtDate)}T${pad2(endsAtDate.getHours())}:00`;

  return (
    <form action={formAction} className="grid w-full min-w-0 gap-3 overflow-x-hidden md:grid-cols-2">
      <select
        name="zoneId"
        value={zoneId}
        onChange={(event) => setZoneId(event.target.value)}
        className="field-base min-w-0"
        required
      >
        <option value="">Selecciona una zona</option>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name} (max {zone.maxHoursPerReservation}h)
          </option>
        ))}
      </select>
      <input
        name="reservationDate"
        type="date"
        value={reservationDate}
        onChange={(event) => setReservationDate(event.target.value)}
        className="field-base min-w-0 w-full max-w-full text-sm"
        required
      />
      <select
        name="startHour"
        value={effectiveStartHour}
        onChange={(event) => setStartHour(event.target.value)}
        className="field-base min-w-0"
        required
      >
        {HOURS.map((hour) => (
          <option key={hour} value={pad2(hour)} disabled={occupiedHours.has(hour)}>
            {formatHourLabel(hour)}
          </option>
        ))}
      </select>
      <select
        name="durationHours"
        value={effectiveDurationText}
        onChange={(event) => setDurationHours(event.target.value)}
        className="field-base min-w-0"
        required
      >
        {durationOptions.map((hours) => (
          <option key={hours} value={String(hours)}>
            {hours} hora{hours > 1 ? "s" : ""}
          </option>
        ))}
      </select>
      <input type="hidden" name="startsAt" value={startsAt} />
      <input type="hidden" name="endsAt" value={endsAt} />
      <input
        name="note"
        className="field-base min-w-0 md:col-span-2"
        placeholder="Nota de reserva (opcional)"
        maxLength={180}
      />
      {availableStartHours.length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 md:col-span-2">
          No hay horas disponibles para esta zona en la fecha seleccionada.
        </p>
      ) : null}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 md:col-span-2">
        <p className="mb-2 font-semibold text-slate-800">Horas ocupadas del dia (tachadas)</p>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {HOURS.map((hour) => {
            const occupied = occupiedHours.has(hour);
            return (
              <span
                key={hour}
                className={
                  occupied
                    ? "rounded border border-red-200 bg-red-50 px-2 py-1 text-center font-medium text-red-600 line-through"
                    : "rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-center font-medium text-emerald-700"
                }
              >
                {formatHourLabel(hour)}
              </span>
            );
          })}
        </div>
      </div>
      <button
        disabled={isPending || availableStartHours.length === 0 || maxSelectableDuration <= 0}
        className="btn-primary md:col-span-2 md:w-max disabled:opacity-60"
      >
        {isPending ? "Reservando..." : "Reservar zona"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
