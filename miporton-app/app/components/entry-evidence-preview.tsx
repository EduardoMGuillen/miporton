"use client";

import { useState } from "react";

async function blobToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    image.src = url;
  });
}

async function compressForPreview(blob: Blob) {
  const originalDataUrl = await blobToDataUrl(blob);
  const image = await loadImage(originalDataUrl);

  const maxWidth = 640;
  const maxHeight = 360;
  const widthRatio = maxWidth / image.width;
  const heightRatio = maxHeight / image.height;
  const ratio = Math.min(widthRatio, heightRatio, 1);
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return originalDataUrl;

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.58);
}

export function EntryEvidencePreview({
  imageUrl,
  alt,
}: {
  imageUrl: string;
  alt: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function loadPreview() {
    if (previewUrl || isLoading) return;
    setFailed(false);
    setIsLoading(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Error cargando evidencia.");
      const blob = await response.blob();
      const compressed = await compressForPreview(blob);
      setPreviewUrl(compressed);
    } catch {
      setFailed(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={alt}
          className="h-44 w-full rounded-lg border border-slate-200 object-cover bg-white"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="h-44 w-full rounded-lg border border-slate-200 bg-white/80 p-3">
          <p className="text-xs text-slate-500">Miniatura no cargada (modo liviano).</p>
          <button
            type="button"
            onClick={() => loadPreview().catch(() => {})}
            disabled={isLoading}
            className="mt-3 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoading ? "Cargando..." : "Ver miniatura"}
          </button>
          {failed ? <p className="mt-2 text-[11px] text-red-600">No se pudo cargar la evidencia.</p> : null}
        </div>
      )}
    </div>
  );
}
