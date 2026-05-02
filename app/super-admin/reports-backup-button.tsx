"use client";

import { useState } from "react";
import { REPORT_BACKUP_MAX_SCANS_PER_MONTH } from "@/lib/reports-backup-constants";

type ManifestPayload = {
  items: { residentialId: string; month: string; residentialName: string }[];
  skipped: { residentialName: string; month: string; scanCount: number }[];
  maxScansPerMonth: number;
};

const DELAY_MS_BETWEEN_DOWNLOADS = 700;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ReportsBackupButton() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [skippedNote, setSkippedNote] = useState<string | null>(null);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    setProgress(null);
    setSkippedNote(null);

    try {
      const manifestRes = await fetch("/api/super-admin/reports-backup-manifest", {
        method: "GET",
        credentials: "same-origin",
      });
      if (!manifestRes.ok) {
        const payload = (await manifestRes.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "No se pudo obtener la lista de reportes mensuales.");
      }

      const manifest = (await manifestRes.json()) as ManifestPayload;
      const { items, skipped, maxScansPerMonth } = manifest;

      if (skipped.length > 0) {
        const preview = skipped
          .slice(0, 5)
          .map((s) => `${s.residentialName} ${s.month} (${s.scanCount} entradas)`)
          .join("; ");
        setSkippedNote(
          `${skipped.length} mes(es) omitidos por superar ${maxScansPerMonth} entradas validas. ` +
            (skipped.length > 5 ? `${preview}…` : preview),
        );
      }

      if (items.length === 0) {
        throw new Error(
          skipped.length > 0
            ? "No hay PDFs para descargar: todos los meses con actividad superan el limite de entradas por archivo."
            : "No hay entradas ni delivery registrados para exportar.",
        );
      }

      const failures: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const job = items[i]!;
        setProgress(`${i + 1} / ${items.length}: ${job.residentialName} (${job.month})`);

        const params = new URLSearchParams({
          residentialId: job.residentialId,
          month: job.month,
        });
        const pdfRes = await fetch(`/api/super-admin/reports-backup-residential-month?${params.toString()}`, {
          method: "GET",
          credentials: "same-origin",
        });

        if (!pdfRes.ok) {
          const contentType = pdfRes.headers.get("content-type") ?? "";
          let detail = `HTTP ${pdfRes.status}`;
          if (contentType.includes("application/json")) {
            const payload = (await pdfRes.json().catch(() => null)) as { error?: string } | null;
            if (payload?.error) detail = payload.error;
          }
          failures.push(`${job.residentialName} ${job.month}: ${detail}`);
        } else {
          const blob = await pdfRes.blob();
          const contentDisposition = pdfRes.headers.get("content-disposition") ?? "";
          const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
          const fileName = fileNameMatch?.[1] || `reporte-${job.month}.pdf`;

          const downloadUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = downloadUrl;
          anchor.download = fileName;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(downloadUrl);
        }

        if (i < items.length - 1) {
          await sleep(DELAY_MS_BETWEEN_DOWNLOADS);
        }
      }

      setProgress(`Listo: ${items.length} PDF(s).`);

      if (failures.length > 0) {
        setError(`Algunos archivos fallaron:\n${failures.slice(0, 8).join("\n")}${failures.length > 8 ? "\n…" : ""}`);
      }
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Error al generar backup.");
      setProgress(null);
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
        {isDownloading ? "Descargando PDFs..." : "Backup PDF (un archivo por residencial y mes, con fotos)"}
      </button>
      {progress ? <p className="text-xs font-medium text-slate-700">{progress}</p> : null}
      {skippedNote ? <p className="text-xs text-amber-800">{skippedNote}</p> : null}
      {error ? (
        <p className="whitespace-pre-wrap text-xs text-red-600">{error}</p>
      ) : null}
      <p className="text-xs text-slate-500">
        El navegador puede pedir permiso para varias descargas seguidas. Cada PDF incluye entradas y delivery de ese
        mes con evidencias incrustadas. Meses con mas de {REPORT_BACKUP_MAX_SCANS_PER_MONTH} entradas validas se omiten
        (aparecen arriba en ambar).
      </p>
    </div>
  );
}
