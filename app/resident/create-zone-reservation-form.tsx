"use client";

import { useActionState } from "react";
import { createZoneReservationAction } from "@/app/resident/actions";

const initialState: string | null = null;

export function CreateZoneReservationForm({
  zones,
}: {
  zones: Array<{ id: string; name: string; maxHoursPerReservation: number }>;
}) {
  const [message, formAction, isPending] = useActionState(createZoneReservationAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <select name="zoneId" className="field-base" required>
        <option value="">Selecciona una zona</option>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name} (max {zone.maxHoursPerReservation}h)
          </option>
        ))}
      </select>
      <input name="startsAt" type="datetime-local" className="field-base" required />
      <input name="endsAt" type="datetime-local" className="field-base" required />
      <input name="note" className="field-base" placeholder="Nota de reserva (opcional)" maxLength={180} />
      <button disabled={isPending} className="btn-primary md:col-span-2 md:w-max disabled:opacity-60">
        {isPending ? "Reservando..." : "Reservar zona"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
