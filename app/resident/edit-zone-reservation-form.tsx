"use client";

import { useEffect, useRef } from "react";
import { useActionState, useMemo, useState } from "react";
import { updateZoneReservationAction } from "@/app/resident/actions";
import { ReservationSuccessDetailDialog } from "@/app/resident/reservation-details-dialog";
import { ReservationScheduleConflictDialog } from "@/app/resident/reservation-schedule-conflict-dialog";
import { isZoneReservationTakenByResidentState } from "@/lib/zone-reservation-feedback";
import type {
  ZoneReservationActionState,
  ZoneReservationDetailPayload,
} from "@/lib/zone-reservation-form-state";
import { formatTimeTegucigalpa } from "@/lib/datetime";

const initialState: ZoneReservationActionState | null = null;

const HOURS = Array.from({ length: 24 }, (_, index) => index);

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatHourLabel(hour: number) {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:00 ${period}`;
}

function dateOnly(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function tegucigalpaWallParts(iso: string) {
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const y = get("year");
  const m = get("month");
  const day = get("day");
  const h = Number(get("hour"));
  const min = Number(get("minute"));
  return {
    datePart: `${y}-${m}-${day}`,
    hour: Number.isNaN(h) ? 8 : h,
    minute: Number.isNaN(min) ? 0 : min,
  };
}

function overlapRange(
  startsAt: Date,
  endsAt: Date,
  otherStart: Date,
  otherEnd: Date,
) {
  return startsAt < otherEnd && endsAt > otherStart;
}

export function EditZoneReservationForm({
  reservationId,
  zoneId,
  zoneName,
  startsAtIso,
  endsAtIso,
  note,
  zone,
  occupiedSlots,
  onSuccessfulSave,
}: {
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
  /** Si se define, no se muestra el popup de éxito aquí; se notifica el detalle guardado. */
  onSuccessfulSave?: (detail: ZoneReservationDetailPayload) => void;
}) {
  const startParts = useMemo(() => tegucigalpaWallParts(startsAtIso), [startsAtIso]);
  const initialDuration = Math.max(
    1,
    Math.round(
      (new Date(endsAtIso).getTime() - new Date(startsAtIso).getTime()) / (1000 * 60 * 60),
    ),
  );

  const [state, formAction, isPending] = useActionState(updateZoneReservationAction, initialState);
  const prevPendingRef = useRef(false);

  useEffect(() => {
    const finished = prevPendingRef.current && !isPending;
    prevPendingRef.current = isPending;
    if (finished && state?.ok === true && onSuccessfulSave) {
      onSuccessfulSave(state.detail);
    }
  }, [isPending, state, onSuccessfulSave]);

  const [reservationDate, setReservationDate] = useState(startParts.datePart);
  const [startHour, setStartHour] = useState(pad2(startParts.hour));
  const [durationHours, setDurationHours] = useState(String(initialDuration));

  const maxHoursByZone = Math.max(1, zone.maxHoursPerReservation);

  const slotRanges = useMemo(
    () =>
      occupiedSlots
        .filter((slot) => slot.zoneId === zoneId)
        .filter((slot) => slot.reservationId !== reservationId)
        .map((slot) => ({
          source: slot.source,
          startsAt: new Date(slot.startsAtIso),
          endsAt: new Date(slot.endsAtIso),
        })),
    [occupiedSlots, reservationId, zoneId],
  );

  const dayReservationBlockingOnePerDay = useMemo(() => {
    if (!zone.oneReservationPerDay || !reservationDate) return null;
    const dayStart = new Date(`${reservationDate}T00:00`);
    const dayEnd = new Date(`${reservationDate}T23:59:59`);
    return (
      slotRanges.find(
        (slot) =>
          slot.source === "reservation" &&
          overlapRange(dayStart, dayEnd, slot.startsAt, slot.endsAt),
      ) ?? null
    );
  }, [zone.oneReservationPerDay, reservationDate, slotRanges]);

  const occupiedHours = useMemo(() => {
    if (!reservationDate) return new Set<number>();
    const dayStart = new Date(`${reservationDate}T00:00`);
    const dayEnd = new Date(`${reservationDate}T23:59:59`);
    const set = new Set<number>();
    const startAllowed = zone.scheduleStartHour;
    const endAllowed = zone.scheduleEndHour;
    const hasReservationInDay =
      zone.oneReservationPerDay &&
      slotRanges.some(
        (slot) =>
          slot.source === "reservation" &&
          overlapRange(dayStart, dayEnd, slot.startsAt, slot.endsAt),
      );
    if (hasReservationInDay) {
      HOURS.forEach((hour) => set.add(hour));
      return set;
    }
    HOURS.forEach((hour) => {
      if (hour < startAllowed || hour >= endAllowed) {
        set.add(hour);
        return;
      }
      const slotStart = new Date(dayStart);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(dayStart);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      const taken = slotRanges.some((s) => overlapRange(slotStart, slotEnd, s.startsAt, s.endsAt));
      if (taken) set.add(hour);
    });
    return set;
  }, [reservationDate, slotRanges, zone]);

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
  const endsAtHidden = `${dateOnly(endsAtDate)}T${pad2(endsAtDate.getHours())}:00`;

  return (
    <>
      <ReservationScheduleConflictDialog state={state} isPending={isPending} />
      {!onSuccessfulSave ? (
        <ReservationSuccessDetailDialog
          state={state}
          isPending={isPending}
          title="Horario actualizado"
        />
      ) : null}
      <form
        action={formAction}
        className="grid min-w-0 max-w-full grid-cols-1 gap-3 overflow-x-hidden md:grid-cols-2"
      >
        <input type="hidden" name="reservationId" value={reservationId} />
        <p className="text-xs text-slate-600 md:col-span-2">
          Zona: <span className="font-semibold text-slate-800">{zoneName}</span>
        </p>
        <div className="min-w-0 max-w-full overflow-hidden md:col-span-2">
          <label htmlFor={`reservation-date-${reservationId}`} className="mb-1 block text-xs font-medium text-slate-600">
            Fecha
          </label>
          <input
            id={`reservation-date-${reservationId}`}
            name="reservationDate"
            type="date"
            value={reservationDate}
            onChange={(event) => setReservationDate(event.target.value)}
            className="field-base box-border min-h-[2.5rem] w-full min-w-0 max-w-full text-sm"
            required
          />
        </div>
        <select
          name="startHour"
          value={availableStartHours.length === 0 ? "" : effectiveStartHour}
          onChange={(event) => setStartHour(event.target.value)}
          className="field-base min-w-0 w-full max-w-full"
          required
          disabled={availableStartHours.length === 0}
        >
          {availableStartHours.length === 0 ? (
            <option value="">No hay horas disponibles</option>
          ) : null}
          {availableStartHours.map((hour) => (
            <option key={hour} value={pad2(hour)}>
              {formatHourLabel(hour)}
            </option>
          ))}
        </select>
        <select
          name="durationHours"
          value={effectiveDurationText}
          onChange={(event) => setDurationHours(event.target.value)}
          className="field-base min-w-0 w-full max-w-full"
          required
        >
          {durationOptions.map((hours) => (
            <option key={hours} value={String(hours)}>
              {hours} hora{hours > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <input type="hidden" name="startsAt" value={startsAt} />
        <input type="hidden" name="endsAt" value={endsAtHidden} />
        <input
          name="note"
          defaultValue={note ?? ""}
          className="field-base min-w-0 w-full max-w-full md:col-span-2"
          placeholder="Nota de reserva (opcional)"
          maxLength={180}
        />
        {zone.oneReservationPerDay && dayReservationBlockingOnePerDay ? (
          <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium leading-relaxed text-sky-950 md:col-span-2">
            La zona <span className="font-semibold">{zoneName}</span> se encuentra reservada de{" "}
            {formatTimeTegucigalpa(dayReservationBlockingOnePerDay.startsAt)} a{" "}
            {formatTimeTegucigalpa(dayReservationBlockingOnePerDay.endsAt)}. Puede acceder a la zona sin
            necesidad de reservación en las demás horas.
          </p>
        ) : availableStartHours.length === 0 ? (
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
          {isPending ? "Guardando..." : "Guardar nuevo horario"}
        </button>
        {state?.ok === false && state.message && !isZoneReservationTakenByResidentState(state) ? (
          <p className="text-sm text-slate-700 md:col-span-2">{state.message}</p>
        ) : null}
      </form>
    </>
  );
}
