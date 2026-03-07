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
        name="description"
        maxLength={180}
        className="field-base md:col-span-2"
        placeholder="Descripcion (opcional)"
      />
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Creando..." : "Crear zona"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
