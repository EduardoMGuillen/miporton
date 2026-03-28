"use client";

import { useActionState } from "react";
import { createZoneAction } from "@/app/residential-admin/actions";

const initialState: string | null = null;

export function CreateZoneForm() {
  const [message, formAction, isPending] = useActionState(createZoneAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input name="name" required className="field-base" placeholder="Nombre de zona" />
      <input
        name="maxHoursPerReservation"
        required
        type="number"
        min={1}
        className="field-base"
        placeholder="Maximo de horas por reserva"
      />
      <input
        name="scheduleStartHour"
        required
        type="number"
        min={0}
        max={23}
        defaultValue={8}
        className="field-base"
        placeholder="Hora inicio (0-23)"
      />
      <input
        name="scheduleEndHour"
        required
        type="number"
        min={1}
        max={24}
        defaultValue={22}
        className="field-base"
        placeholder="Hora fin (1-24)"
      />
      <input
        name="description"
        maxLength={180}
        className="field-base md:col-span-2"
        placeholder="Descripcion (opcional)"
      />
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:col-span-2">
        <input type="checkbox" name="oneReservationPerDay" className="h-4 w-4 accent-blue-600" />
        1 reserva por dia
      </label>
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Creando..." : "Crear zona"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
