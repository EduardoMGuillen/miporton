"use client";

import { useActionState } from "react";
import { createInviteQrAction } from "@/app/resident/actions";

const initialState: string | null = null;

export function CreateQrForm() {
  const [message, formAction, isPending] = useActionState(createInviteQrAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input
        name="visitorName"
        required
        placeholder="Nombre de la visita"
        className="field-base"
      />
      <select
        name="validityType"
        defaultValue="SINGLE_USE"
        className="field-base"
      >
        <option value="SINGLE_USE">1 solo uso</option>
        <option value="ONE_DAY">Valido por 1 dia</option>
        <option value="THREE_DAYS">Valido por maximo 3 dias</option>
        <option value="INFINITE">Validez infinita (sin vencimiento)</option>
      </select>
      <input
        name="description"
        placeholder="Descripcion (opcional)"
        className="field-base md:col-span-2"
        maxLength={180}
      />
      <select name="hasVehicle" defaultValue="no" className="field-base">
        <option value="no">Acceso peatonal</option>
        <option value="yes">Vehiculo</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary disabled:opacity-60 md:col-span-2 md:w-max"
      >
        {isPending ? "Generando..." : "Generar QR"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
