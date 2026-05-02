"use client";

import { useState } from "react";

export function ReportsBackupButton() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      const response = await fetch("/api/super-admin/reports-backup", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error || "No se pudo generar el backup.");
        }
        if (response.status === 504 || response.status === 408) {
          throw new Error(
            "Tiempo agotado en el servidor al generar el ZIP. Reintenta; si persiste, el plan de hosting puede limitar la duracion de la funcion.",
          );
        }
        const fallbackText = (await response.text().catch(() => "")).trim().slice(0, 280);
        throw new Error(
          fallbackText
            ? `Error ${response.status}: ${fallbackText}`
            : `Error HTTP ${response.status} al generar el backup (respuesta no JSON).`,
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
      const fileName = fileNameMatch?.[1] || "mivisita-reports-backup.zip";

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
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
      >
        {isDownloading ? "Generando backup..." : "Descargar backup PDF por residencial (ZIP)"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">
        Un PDF por residencial (entradas, delivery, descripcion del QR). Las fotos de evidencia no se incrustan aqui
        para evitar timeouts; usa el backup de base de datos para archivar imagenes.
      </p>
    </div>
  );
}
