"use client";

import { useActionState } from "react";
import { createPatrolZoneAction } from "@/app/residential-admin/patrullaje-actions";

const initialState: string | null = null;

export function CreatePatrolZoneForm() {
  const [message, formAction, isPending] = useActionState(createPatrolZoneAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input name="name" required maxLength={80} className="field-base" placeholder="Nombre de zona (ej. Caseta norte)" />
      <input
        name="description"
        maxLength={180}
        className="field-base"
        placeholder="Descripcion (opcional)"
      />
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Creando..." : "Crear zona de patrullaje"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
