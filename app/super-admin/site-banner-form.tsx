"use client";

import { useActionState } from "react";
import type { SiteBannerVariant } from "@prisma/client";
import { updateSiteBannerAction } from "@/app/super-admin/actions";

const initialState: string | null = null;

const VARIANT_OPTIONS: { value: SiteBannerVariant; label: string; hint: string }[] = [
  { value: "INFO", label: "Informativo (azul)", hint: "Avisos generales, novedades" },
  { value: "SUCCESS", label: "Positivo (verde)", hint: "Buenas noticias, confirmaciones" },
  { value: "WARNING", label: "Atencion (ambar)", hint: "Mantenimiento programado, recordatorios" },
  { value: "ALERT", label: "Urgente (rojo)", hint: "Interrupciones, situaciones criticas" },
  { value: "NEUTRAL", label: "Neutro (gris)", hint: "Texto discreto sin tono de alerta" },
];

type SiteBannerFormProps = {
  enabled: boolean;
  message: string;
  variant: SiteBannerVariant;
};

export function SiteBannerForm({ enabled, message, variant }: SiteBannerFormProps) {
  const [feedback, formAction, isPending] = useActionState(updateSiteBannerAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
        <input
          type="checkbox"
          name="bannerEnabled"
          defaultChecked={enabled}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        Mostrar banner a todos los usuarios
      </label>
      <div>
        <label htmlFor="site-banner-variant" className="mb-1 block text-xs font-semibold text-slate-600">
          Estilo del banner
        </label>
        <select
          id="site-banner-variant"
          name="variant"
          defaultValue={variant}
          className="field-base w-full max-w-md"
        >
          {VARIANT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.hint}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Elige el color segun el tipo de mensaje; no todo aviso tiene que verse como error.
        </p>
      </div>
      <div>
        <label htmlFor="site-banner-message" className="mb-1 block text-xs font-semibold text-slate-600">
          Mensaje (parte superior de la app)
        </label>
        <textarea
          id="site-banner-message"
          name="message"
          defaultValue={message}
          rows={4}
          maxLength={500}
          className="field-base min-h-[100px] w-full"
          placeholder="Ej: Mantenimiento programado el domingo de 2:00 a 4:00 AM."
        />
        <p className="mt-1 text-xs text-slate-500">Maximo 500 caracteres. Debe haber texto si el banner esta activo.</p>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary w-max disabled:opacity-60">
        {isPending ? "Guardando..." : "Guardar banner"}
      </button>
      {feedback ? <p className="text-sm text-slate-700">{feedback}</p> : null}
    </form>
  );
}
