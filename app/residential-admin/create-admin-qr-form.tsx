"use client";

import { useActionState, useState } from "react";
import { createAdminQrAction } from "@/app/residential-admin/actions";

const initialState: string | null = null;

export function CreateAdminQrForm({
  residents,
}: {
  residents: Array<{ id: string; fullName: string }>;
}) {
  const [qrMode, setQrMode] = useState<"GENERAL" | "RESIDENT">("GENERAL");
  const [message, formAction, isPending] = useActionState(createAdminQrAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input name="visitorName" required className="field-base" placeholder="Nombre de la visita" />
      <select name="validityType" defaultValue="SINGLE_USE" className="field-base">
        <option value="SINGLE_USE">1 solo uso</option>
        <option value="ONE_DAY">Valido por 1 dia</option>
        <option value="THREE_DAYS">Valido por 3 dias</option>
        <option value="INFINITE">Validez infinita</option>
      </select>
      <input
        name="description"
        maxLength={180}
        className="field-base md:col-span-2"
        placeholder="Descripcion (opcional)"
      />
      <select name="hasVehicle" defaultValue="no" className="field-base">
        <option value="no">Sin vehiculo</option>
        <option value="yes">Viene en vehiculo</option>
      </select>
      <select
        name="qrMode"
        value={qrMode}
        onChange={(event) => setQrMode(event.target.value as "GENERAL" | "RESIDENT")}
        className="field-base"
      >
        <option value="GENERAL">QR general de residencial</option>
        <option value="RESIDENT">QR a nombre de residente</option>
      </select>
      {qrMode === "RESIDENT" ? (
        <select name="residentId" required className="field-base md:col-span-2">
          <option value="">Selecciona residente</option>
          {residents.map((resident) => (
            <option key={resident.id} value={resident.id}>
              {resident.fullName}
            </option>
          ))}
        </select>
      ) : null}
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Generando..." : "Generar QR"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
