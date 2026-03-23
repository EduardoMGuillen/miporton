"use client";

import { useActionState } from "react";
import { updateResidentialSettingsAction } from "@/app/residential-admin/actions";

const initialState: string | null = null;

export function UpdateResidentialSettingsForm({
  supportPhone,
  allowResidentQrSingleUse,
  allowResidentQrOneDay,
  allowResidentQrThreeDays,
  allowResidentQrInfinite,
}: {
  supportPhone: string;
  allowResidentQrSingleUse: boolean;
  allowResidentQrOneDay: boolean;
  allowResidentQrThreeDays: boolean;
  allowResidentQrInfinite: boolean;
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
      <label className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        Vigencias QR permitidas para residentes
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="allowResidentQrSingleUse"
          defaultChecked={allowResidentQrSingleUse}
          className="h-4 w-4 accent-blue-600"
        />
        1 solo uso
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="allowResidentQrOneDay"
          defaultChecked={allowResidentQrOneDay}
          className="h-4 w-4 accent-blue-600"
        />
        Valido por 1 dia
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="allowResidentQrThreeDays"
          defaultChecked={allowResidentQrThreeDays}
          className="h-4 w-4 accent-blue-600"
        />
        Valido por 3 dias
      </label>
      <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="allowResidentQrInfinite"
          defaultChecked={allowResidentQrInfinite}
          className="h-4 w-4 accent-blue-600"
        />
        Validez infinita
      </label>
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Guardando..." : "Guardar configuracion"}
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
