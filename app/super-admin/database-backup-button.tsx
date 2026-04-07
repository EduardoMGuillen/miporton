"use client";

import { useState } from "react";

export function DatabaseBackupButton() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch("/api/super-admin/database-backup", {
        method: "GET",
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "No se pudo generar el backup de base de datos.");
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
        Incluye tablas en JSON y fotos de evidencia como archivos dentro de evidence/ (ZIP mas eficiente que base64).
      </p>
    </div>
  );
}
