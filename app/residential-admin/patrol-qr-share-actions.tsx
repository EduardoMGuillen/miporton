"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

type Props = {
  qrDataUrl: string;
  zoneName: string;
  code: string;
  residentialName: string;
};

const LOGO_SRC = "/logo.png";
const STICKER_SIZE = 1800;

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

/** Sticker HD: logo, PATRULLAJE, zona, residencial y QR regenerado. */
async function buildStickerPngBlob(props: Props): Promise<Blob> {
  const size = STICKER_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const hdQrDataUrl = await QRCode.toDataURL(`MPP:${props.code}`, {
    width: 1400,
    margin: 1,
    errorCorrectionLevel: "H",
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const [logo, qrImage] = await Promise.all([
    loadImage(LOGO_SRC).catch(() => null),
    loadImage(hdQrDataUrl).catch(() => loadImage(props.qrDataUrl)),
  ]);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (logo) {
    const logoSize = 200;
    const logoX = size / 2 - logoSize / 2;
    const logoY = 48;
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 36);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "bold 64px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MiVisita", size / 2, 160);
  }

  ctx.fillStyle = "#6d28d9";
  ctx.font = "700 42px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PATRULLAJE", size / 2, 300);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 72px Arial, Helvetica, sans-serif";
  const zoneLines = wrapLines(ctx, props.zoneName, size - 120, 2);
  const zoneStartY = 380;
  zoneLines.forEach((line, index) => {
    ctx.fillText(line, size / 2, zoneStartY + index * 78);
  });

  ctx.fillStyle = "#475569";
  ctx.font = "600 42px Arial, Helvetica, sans-serif";
  const residentialY = zoneStartY + zoneLines.length * 78 + 28;
  const residentialLines = wrapLines(ctx, props.residentialName, size - 140, 2);
  residentialLines.forEach((line, index) => {
    ctx.fillText(line, size / 2, residentialY + index * 48);
  });

  const headerBottom = residentialY + residentialLines.length * 48 + 28;
  const bottomPad = 56;
  const maxQr = size - headerBottom - bottomPad;
  const qrOuter = Math.min(980, maxQr);
  const qrX = (size - qrOuter) / 2;
  const qrY = headerBottom + Math.max(0, (maxQr - qrOuter) / 2);
  const qrPad = 16;

  roundRect(ctx, qrX, qrY, qrOuter, qrOuter, 32);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 4;
  ctx.stroke();

  // imageSmoothingEnabled false keeps QR modules crisp when scaling
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, qrX + qrPad, qrY + qrPad, qrOuter - qrPad * 2, qrOuter - qrPad * 2);
  ctx.imageSmoothingEnabled = true;

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

  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");

  // Una sola copia, grande y centrada
  const stickerPt = Math.min(480, pageW - 72, pageH - 72);
  const stickerX = (pageW - stickerPt) / 2;
  const stickerY = (pageH - stickerPt) / 2;
  doc.addImage(stickerDataUrl, "PNG", stickerX, stickerY, stickerPt, stickerPt, undefined, "NONE");

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
