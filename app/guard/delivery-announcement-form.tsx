"use client";

import { useActionState } from "react";
import { announceDeliveryAtGateAction } from "@/app/guard/actions";

const initialState: string | null = null;

export function GuardDeliveryAnnouncementForm({
  residents,
}: {
  residents: Array<{ id: string; fullName: string }>;
}) {
  const [message, formAction, isPending] = useActionState(announceDeliveryAtGateAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <select name="residentId" required className="field-base md:col-span-2">
        <option value="">Selecciona residente</option>
        {residents.map((resident) => (
          <option key={resident.id} value={resident.id}>
            {resident.fullName}
          </option>
        ))}
      </select>
      <input
        name="deliveryNote"
        required
        className="field-base md:col-span-2"
        placeholder="Ej: Paquete de Amazon, pedido #1234"
        maxLength={180}
      />
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Enviando..." : "Notificar delivery al residente"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
