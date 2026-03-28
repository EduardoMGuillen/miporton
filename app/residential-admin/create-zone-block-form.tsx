"use client";

import { useActionState } from "react";
import { createZoneBlockAction } from "@/app/residential-admin/actions";

const initialState: string | null = null;

export function CreateZoneBlockForm({
  zones,
}: {
  zones: Array<{ id: string; name: string }>;
}) {
  const [message, formAction, isPending] = useActionState(createZoneBlockAction, initialState);

  return (
    <form action={formAction} className="grid w-full min-w-0 gap-3 overflow-x-hidden md:grid-cols-2">
      <select name="zoneId" required className="field-base min-w-0 md:col-span-2">
        <option value="">Selecciona zona a bloquear</option>
        {zones.map((zone) => (
          <option key={zone.id} value={zone.id}>
            {zone.name}
          </option>
        ))}
      </select>
      <input
        name="startsAt"
        type="datetime-local"
        required
        className="field-base min-w-0 w-full max-w-full text-sm"
      />
      <input
        name="endsAt"
        type="datetime-local"
        required
        className="field-base min-w-0 w-full max-w-full text-sm"
      />
      <input
        name="reason"
        maxLength={180}
        className="field-base min-w-0 md:col-span-2"
        placeholder="Motivo de bloqueo (opcional)"
      />
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Bloqueando..." : "Bloquear horario"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
