"use client";

import { useActionState } from "react";
import { updateResidentialSettingsAction } from "@/app/residential-admin/actions";

const initialState: string | null = null;

export function UpdateResidentialSettingsForm({
  supportPhone,
}: {
  supportPhone: string;
}) {
  const [message, formAction, isPending] = useActionState(updateResidentialSettingsAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:max-w-lg">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Numero de contacto (WhatsApp soporte)
      </label>
      <input
        name="supportPhone"
        className="field-base"
        placeholder="Ej: 50499999999"
        defaultValue={supportPhone}
        required
      />
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Guardando..." : "Guardar numero de soporte"}
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
