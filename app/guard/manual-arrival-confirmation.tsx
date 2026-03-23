"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ManualArrivalConfirmation({
  qrId,
  hasVehicle,
}: {
  qrId: string;
  hasVehicle: boolean;
}) {
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function submitManualEntry(formData: FormData) {
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/guard/manual-entry-with-id", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setMessage(payload?.error ?? "No se pudo registrar la entrada manual.");
        return;
      }
      setMessage("Entrada manual registrada correctamente.");
      setIsCaptureOpen(false);
      router.refresh();
    } catch {
      setMessage("Ocurrio un error registrando la entrada manual.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={submitManualEntry} className="mt-2 grid gap-2">
      <input type="hidden" name="qrId" value={qrId} />
      {!isCaptureOpen ? (
        <button
          type="button"
          onClick={() => setIsCaptureOpen(true)}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
        >
          Confirmar llegada manual
        </button>
      ) : null}

      {isCaptureOpen ? (
        <>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
            Foto del ID
          </label>
          <input
            type="file"
            name="idPhoto"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            required
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
          />
          {hasVehicle ? (
            <>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Foto de placa
              </label>
              <input
                type="file"
                name="platePhoto"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                required
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700"
              />
            </>
          ) : null}
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setIsCaptureOpen(false);
                setMessage(null);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              {isSubmitting ? "Guardando..." : "Guardar entrada manual"}
            </button>
          </div>
        </>
      ) : null}
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
    </form>
  );
}
