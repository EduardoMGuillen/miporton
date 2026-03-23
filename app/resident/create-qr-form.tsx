"use client";

import { useActionState } from "react";
import { createInviteQrAction } from "@/app/resident/actions";

const initialState: string | null = null;

type ValidityType = "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS" | "INFINITE";

const VALIDITY_LABELS: Record<ValidityType, string> = {
  SINGLE_USE: "1 solo uso",
  ONE_DAY: "Valido por 1 dia",
  THREE_DAYS: "Valido por maximo 3 dias",
  INFINITE: "Validez infinita (sin vencimiento)",
};

export function CreateQrForm({ allowedValidityTypes }: { allowedValidityTypes: ValidityType[] }) {
  const [message, formAction, isPending] = useActionState(createInviteQrAction, initialState);
  const options: ValidityType[] =
    allowedValidityTypes.length > 0 ? allowedValidityTypes : ["SINGLE_USE"];
  const hasAllowedValidity = allowedValidityTypes.length > 0;

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
        defaultValue={options[0]}
        className="field-base"
        disabled={!hasAllowedValidity}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {VALIDITY_LABELS[option]}
          </option>
        ))}
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
        disabled={isPending || !hasAllowedValidity}
        className="btn-primary disabled:opacity-60 md:col-span-2 md:w-max"
      >
        {isPending ? "Generando..." : "Generar QR"}
      </button>
      {!hasAllowedValidity ? (
        <p className="text-sm text-amber-700 md:col-span-2">
          La administracion desactivo temporalmente todas las vigencias QR para residentes.
        </p>
      ) : null}
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
