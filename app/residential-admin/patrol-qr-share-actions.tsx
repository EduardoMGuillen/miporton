"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";

type Props = {
  qrDataUrl: string;
  zoneName: string;
  code: string;
  residentialName: string;
};

const LOGO_SRC = "/logo.png";

function safeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll(/[^a-z0-9-]/g, "");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar: ${src}`));
    image.src = src;
  });
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = words[0]!;

  for (let i = 1; i < words.length; i += 1) {
    const word = words[i]!;
    const candidate = `${current} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
      if (lines.length >= maxLines - 1) break;
    }
  }

  if (lines.length < maxLines) {
    lines.push(current);
  } else {
    let last = lines[lines.length - 1] ?? current;
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last}…`;
  }

  return lines;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Sticker cuadrado listo para imprimir / cortar. */
async function buildStickerPngBlob(props: Props): Promise<Blob> {
  const size = 1200;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const [logo, qrImage] = await Promise.all([
    loadImage(LOGO_SRC).catch(() => null),
    loadImage(props.qrDataUrl),
  ]);

  // Fondo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // Marco exterior
  roundRect(ctx, 28, 28, size - 56, size - 56, 48);
  ctx.strokeStyle = "#c7d2fe";
  ctx.lineWidth = 8;
  ctx.stroke();

  // Logo
  if (logo) {
    const logoSize = 150;
    const logoX = size / 2 - logoSize / 2;
    const logoY = 64;
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 28);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    ctx.restore();
    // subtle ring
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 28);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "bold 48px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MiVisita", size / 2, 150);
  }

  ctx.fillStyle = "#6d28d9";
  ctx.font = "700 26px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PATRULLAJE", size / 2, 250);

  // Nombre de zona
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 52px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  const zoneLines = wrapLines(ctx, props.zoneName, size - 160, 2);
  const zoneStartY = 310;
  zoneLines.forEach((line, index) => {
    ctx.fillText(line, size / 2, zoneStartY + index * 58);
  });

  // Residencial
  ctx.fillStyle = "#64748b";
  ctx.font = "500 26px Arial, Helvetica, sans-serif";
  const residentialY = zoneStartY + zoneLines.length * 58 + 12;
  const residentialLines = wrapLines(ctx, props.residentialName, size - 180, 1);
  ctx.fillText(residentialLines[0] ?? "", size / 2, residentialY);

  // QR card
  const qrOuter = 540;
  const qrInnerPad = 26;
  const qrX = (size - qrOuter) / 2;
  const qrY = Math.max(residentialY + 28, 430);
  roundRect(ctx, qrX, qrY, qrOuter, qrOuter, 36);
  ctx.fillStyle = "#f8fafc";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  roundRect(
    ctx,
    qrX + qrInnerPad,
    qrY + qrInnerPad,
    qrOuter - qrInnerPad * 2,
    qrOuter - qrInnerPad * 2,
    20,
  );
  ctx.fill();

  const qrDraw = qrOuter - qrInnerPad * 2 - 24;
  ctx.drawImage(
    qrImage,
    qrX + qrInnerPad + 12,
    qrY + qrInnerPad + 12,
    qrDraw,
    qrDraw,
  );

  // Pie
  const footerY = Math.min(qrY + qrOuter + 48, size - 48);
  ctx.fillStyle = "#475569";
  ctx.font = "500 24px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Escanea en Guardar Patrullaje", size / 2, footerY);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) throw new Error("No se pudo generar el sticker PNG");
  return blob;
}

async function buildStickerPdfBlob(props: Props): Promise<Blob> {
  const stickerBlob = await buildStickerPngBlob(props);
  const stickerDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el sticker"));
    reader.readAsDataURL(stickerBlob);
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Guía de impresión
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Sticker de patrullaje — listo para imprimir", pageW / 2, 42, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("Recorta por el borde. Tamaño aproximado 9 × 9 cm.", pageW / 2, 60, { align: "center" });

  const stickerPt = 280;
  const stickerX = (pageW - stickerPt) / 2;
  const stickerY = 90;
  doc.addImage(stickerDataUrl, "PNG", stickerX, stickerY, stickerPt, stickerPt);

  // Segunda copia (mismo sticker) para imprimir dos
  const stickerY2 = stickerY + stickerPt + 36;
  if (stickerY2 + stickerPt < pageH - 40) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineDashPattern([4, 4], 0);
    doc.line(40, stickerY + stickerPt + 18, pageW - 40, stickerY + stickerPt + 18);
    doc.setLineDashPattern([], 0);
    doc.addImage(stickerDataUrl, "PNG", stickerX, stickerY2, stickerPt, stickerPt);
  }

  return doc.output("blob");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function PatrolQrShareActions(props: Props) {
  const fileBase = useMemo(
    () => `patrullaje-${safeFilePart(props.zoneName) || "zona"}`,
    [props.zoneName],
  );

  async function downloadPdf() {
    const blob = await buildStickerPdfBlob(props);
    triggerDownload(blob, `${fileBase}.pdf`);
  }

  async function downloadPng() {
    const blob = await buildStickerPngBlob(props);
    triggerDownload(blob, `${fileBase}.png`);
  }

  async function share() {
    try {
      const blob = await buildStickerPngBlob(props);
      const file = new File([blob], `${fileBase}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Patrullaje: ${props.zoneName}`,
          text: `Sticker QR de patrullaje — ${props.zoneName}`,
          files: [file],
        });
        return;
      }
    } catch {
      // fallback
    }
    await downloadPng();
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => void share().catch(() => {})}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        Compartir
      </button>
      <button
        type="button"
        onClick={() => void downloadPng().catch(() => {})}
        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        Descargar PNG
      </button>
      <button
        type="button"
        onClick={() => void downloadPdf().catch(() => {})}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-700 transition hover:bg-blue-100"
      >
        Descargar PDF
      </button>
    </div>
  );
}
