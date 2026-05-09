"use client";

import { useState } from "react";

export function DatabaseBackupButton() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeEvidence, setIncludeEvidence] = useState(true);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (!includeEvidence) {
        params.set("skipEvidence", "true");
      }
      const qs = params.toString();
      const response = await fetch(
        `/api/super-admin/database-backup${qs ? `?${qs}` : ""}`,
        {
          method: "GET",
        },
      );
      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            detail?: string;
          } | null;
          const base = payload?.error || "No se pudo generar el backup de base de datos.";
          const detail = payload?.detail?.trim();
          throw new Error(detail ? `${base} (${detail})` : base);
        }
        if (response.status === 413) {
          throw new Error(
            "El archivo supera el tamano maximo de descarga del servidor. Usa el backup PDF o contacta soporte.",
          );
        }
        if (response.status === 504 || response.status === 408) {
          throw new Error("Tiempo agotado al generar el backup. Reintenta en un momento.");
        }
        throw new Error("No se pudo generar el backup de base de datos.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
      const fileName = fileNameMatch?.[1] || "mivisita-database-backup.zip";

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Error al generar backup.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={includeEvidence}
          onChange={(e) => {
            setIncludeEvidence(e.target.checked);
          }}
          className="mt-1 rounded border-slate-300"
        />
        <span>
          Incluir fotos de evidencia en el ZIP (archivos en{" "}
          <code className="text-xs">evidence/</code>). En planes con poco tiempo de ejecución puede
          fallar; desmárcalo para un backup rápido con tablas y metadatos de escaneos sin imágenes.
        </span>
      </label>
      <button
        type="button"
        onClick={() => {
          void handleDownload();
        }}
        disabled={isDownloading}
        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
      >
        {isDownloading ? "Generando backup BD..." : "Descargar backup completo de base de datos (ZIP)"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">
        Incluye tablas en JSON; con evidencia, las fotos van en el ZIP (sin base64 en JSON).
      </p>
    </div>
  );
}
