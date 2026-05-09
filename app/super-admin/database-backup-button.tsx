"use client";

import { useState } from "react";

type EvidenceInfo = {
  scansWithEvidence: number;
  pageSize: number;
  totalParts: number;
  defaultPageSize: number;
  maxPageSize: number;
};

async function downloadZipFromResponse(response: Response): Promise<void> {
  const blob = await response.blob();
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const fileName = fileNameMatch?.[1] || "download.zip";
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}

export function DatabaseBackupButton() {
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [isDownloadingSingle, setIsDownloadingSingle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeEvidence, setIncludeEvidence] = useState(false);

  const [evidenceInfo, setEvidenceInfo] = useState<EvidenceInfo | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [pageSizeChoice, setPageSizeChoice] = useState(40);
  const [downloadingPart, setDownloadingPart] = useState<number | null>(null);

  async function handleDownloadDataOnly() {
    setIsDownloadingData(true);
    setError(null);
    try {
      const response = await fetch(
        "/api/super-admin/database-backup?skipEvidence=true",
        { method: "GET" },
      );
      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            detail?: string;
          } | null;
          const base = payload?.error || "No se pudo generar el backup de datos.";
          const detail = payload?.detail?.trim();
          throw new Error(detail ? `${base} (${detail})` : base);
        }
        throw new Error("No se pudo generar el backup de datos.");
      }
      await downloadZipFromResponse(response);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Error al generar backup.");
    } finally {
      setIsDownloadingData(false);
    }
  }

  async function loadEvidenceParts() {
    setEvidenceLoading(true);
    setEvidenceError(null);
    try {
      const response = await fetch(
        `/api/super-admin/database-backup-evidence?info=true&pageSize=${pageSizeChoice}`,
        { method: "GET" },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
          detail?: string;
        } | null;
        const base = payload?.error || "No se pudo consultar las partes de evidencia.";
        const detail = payload?.detail?.trim();
        throw new Error(detail ? `${base} (${detail})` : base);
      }
      const data = (await response.json()) as EvidenceInfo;
      setEvidenceInfo(data);
    } catch (e) {
      setEvidenceInfo(null);
      setEvidenceError(e instanceof Error ? e.message : "Error al cargar partes.");
    } finally {
      setEvidenceLoading(false);
    }
  }

  async function handleDownloadEvidencePart(part: number) {
    const pageSize = evidenceInfo?.pageSize ?? pageSizeChoice;
    setDownloadingPart(part);
    setEvidenceError(null);
    try {
      const response = await fetch(
        `/api/super-admin/database-backup-evidence?part=${part}&pageSize=${pageSize}`,
        { method: "GET" },
      );
      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
            detail?: string;
          } | null;
          const base = payload?.error || "No se pudo descargar esta parte.";
          const detail = payload?.detail?.trim();
          throw new Error(detail ? `${base} (${detail})` : base);
        }
        if (response.status === 504 || response.status === 408) {
          throw new Error("Tiempo agotado. Prueba menos escaneos por parte (30) y vuelve a cargar partes.");
        }
        throw new Error("No se pudo descargar esta parte.");
      }
      await downloadZipFromResponse(response);
    } catch (e) {
      setEvidenceError(e instanceof Error ? e.message : "Error al descargar parte.");
    } finally {
      setDownloadingPart(null);
    }
  }

  async function handleDownloadSingleZip() {
    setIsDownloadingSingle(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (!includeEvidence) {
        params.set("skipEvidence", "true");
      }
      const qs = params.toString();
      const response = await fetch(
        `/api/super-admin/database-backup${qs ? `?${qs}` : ""}`,
        { method: "GET" },
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
            "El archivo supera el tamano maximo del servidor. Usa las dos descargas de arriba o npm run backup:db.",
          );
        }
        if (response.status === 504 || response.status === 408) {
          throw new Error("Tiempo agotado. Usa backup en dos partes o npm run backup:db en tu PC.");
        }
        throw new Error("No se pudo generar el backup de base de datos.");
      }
      await downloadZipFromResponse(response);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Error al generar backup.");
    } finally {
      setIsDownloadingSingle(false);
    }
  }

  const busy = isDownloadingData || isDownloadingSingle || evidenceLoading || downloadingPart !== null;

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-800">
          Backup en dos descargas (recomendado en Vercel)
        </p>
        <p className="mb-3 text-xs text-slate-600">
          Primero los datos (JSON y metadatos de escaneos). Luego las fotos en uno o varios ZIP
          pequeños; cada parte incluye solo carpetas <code className="text-[11px]">evidence/</code> y un{" "}
          <code className="text-[11px]">evidence-part-manifest.json</code>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void handleDownloadDataOnly();
            }}
            disabled={busy}
            className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-semibold text-violet-800 shadow-sm transition hover:bg-violet-50 disabled:opacity-60"
          >
            {isDownloadingData ? "Generando…" : "1/2 — Descargar datos (ZIP, sin fotos)"}
          </button>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <p className="mb-2 text-xs font-medium text-slate-700">2/2 — Evidencia (fotos)</p>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-slate-600">
              Escaneos por parte
              <select
                value={pageSizeChoice}
                disabled={busy}
                onChange={(e) => {
                  setPageSizeChoice(Number(e.target.value));
                  setEvidenceInfo(null);
                }}
                className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-800"
              >
                <option value={30}>30 (mas estable)</option>
                <option value={40}>40</option>
                <option value={60}>60</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                void loadEvidenceParts();
              }}
              disabled={busy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
            >
              {evidenceLoading ? "Consultando…" : "Cargar partes"}
            </button>
          </div>
          {evidenceError ? <p className="text-xs text-red-600">{evidenceError}</p> : null}
          {evidenceInfo ? (
            evidenceInfo.totalParts === 0 ? (
              <p className="text-xs text-slate-600">No hay escaneos con fotos guardadas.</p>
            ) : (
              <div className="grid gap-2">
                <p className="text-xs text-slate-600">
                  {evidenceInfo.scansWithEvidence} escaneos con foto · {evidenceInfo.totalParts} parte
                  {evidenceInfo.totalParts !== 1 ? "s" : ""} ({evidenceInfo.pageSize} escaneos máx. por
                  ZIP)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: evidenceInfo.totalParts }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        void handleDownloadEvidencePart(p);
                      }}
                      className="rounded border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                    >
                      {downloadingPart === p ? "…" : `Parte ${p}`}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-slate-200 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-700">Un solo ZIP (avanzado)</p>
        <label className="mb-2 flex cursor-pointer items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeEvidence}
            onChange={(e) => {
              setIncludeEvidence(e.target.checked);
            }}
            className="mt-1 rounded border-slate-300"
          />
          <span>
            Incluir fotos en el mismo archivo. Puede fallar por tiempo en plan Hobby; para fotos usa
            las partes de arriba o{" "}
            <code className="text-[11px]">npm run backup:db</code> en tu PC.
          </span>
        </label>
        <button
          type="button"
          onClick={() => {
            void handleDownloadSingleZip();
          }}
          disabled={busy}
          className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
        >
          {isDownloadingSingle ? "Generando backup BD…" : "Descargar un solo ZIP"}
        </button>
      </div>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
