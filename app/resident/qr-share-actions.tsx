"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";
import { residentT } from "@/app/resident/resident-dictionary";
import { useOptionalResidentT } from "@/app/resident/resident-i18n-context";

type Props = {
  qrDataUrl: string;
  visitorName: string;
  code: string;
  validityLabel: string;
  validUntilLabel: string;
  residentialName: string;
  residentName: string;
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

/** Sticker simple: logo + nombre visita + QR grande. */
async function buildVisitStickerPngBlob(props: Props): Promise<Blob> {
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

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (logo) {
    const logoSize = 96;
    const logoX = size / 2 - logoSize / 2;
    const logoY = 48;
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 18);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "bold 36px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MiVisita", size / 2, 100);
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 48px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  const nameLines = wrapLines(ctx, props.visitorName || "Visita", size - 120, 2);
  const nameStartY = 190;
  nameLines.forEach((line, index) => {
    ctx.fillText(line, size / 2, nameStartY + index * 54);
  });

  // Una línea corta de vigencia (sin saturar el sticker)
  ctx.fillStyle = "#64748b";
  ctx.font = "500 26px Arial, Helvetica, sans-serif";
  const validityY = nameStartY + nameLines.length * 54 + 28;
  const validityLines = wrapLines(ctx, props.validityLabel, size - 160, 1);
  ctx.fillText(validityLines[0] ?? "", size / 2, validityY);

  const headerBottom = validityY + 24;
  const bottomPad = 56;
  const maxQr = size - headerBottom - bottomPad;
  const qrOuter = Math.min(780, maxQr);
  const qrX = (size - qrOuter) / 2;
  const qrY = headerBottom + (maxQr - qrOuter) / 2;
  const qrPad = 20;

  roundRect(ctx, qrX, qrY, qrOuter, qrOuter, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.drawImage(qrImage, qrX + qrPad, qrY + qrPad, qrOuter - qrPad * 2, qrOuter - qrPad * 2);

  ctx.fillStyle = "#64748b";
  ctx.font = "500 24px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("www.mivisita.app", size / 2, size - 36);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) throw new Error("No se pudo generar el sticker PNG");
  return blob;
}

async function buildVisitStickerPdfBlob(props: Props, printTitle: string): Promise<Blob> {
  const stickerBlob = await buildVisitStickerPngBlob(props);
  const stickerDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el sticker"));
    reader.readAsDataURL(stickerBlob);
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(printTitle, pageW / 2, 42, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${props.residentialName} · ${props.residentName}`, pageW / 2, 60, { align: "center" });

  const stickerPt = 320;
  const stickerX = (pageW - stickerPt) / 2;
  const stickerY = 90;
  doc.addImage(stickerDataUrl, "PNG", stickerX, stickerY, stickerPt, stickerPt);

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
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function useQrShareT() {
  const i18n = useOptionalResidentT();
  return useMemo(
    () =>
      i18n?.t ??
      ((key: string, vars?: Record<string, string | number>) => residentT("es", key, vars)),
    [i18n],
  );
}

export function QrShareActions(props: Props) {
  const t = useQrShareT();
  const fileBaseName = `mivisita-pase-${safeFilePart(props.visitorName || "visita")}`;
  const printTitle = t("qr.pdfTitle");

  async function downloadPdf() {
    const blob = await buildVisitStickerPdfBlob(props, printTitle);
    triggerDownload(blob, `${fileBaseName}.pdf`);
  }

  async function downloadImage() {
    const blob = await buildVisitStickerPngBlob(props);
    triggerDownload(blob, `${fileBaseName}.png`);
  }

  async function shareToWhatsApp() {
    const shareText = t("qr.shareText", { name: props.visitorName });
    try {
      const blob = await buildVisitStickerPngBlob(props);
      const file = new File([blob], `${fileBaseName}.png`, { type: "image/png" });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: t("qr.shareTitle"),
          text: shareText,
          files: [file],
        });
        return;
      }
    } catch {
      // fallback
    }

    await downloadImage();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(t("qr.shareFallback", { text: shareText }))}`;
    window.location.href = whatsappUrl;
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => shareToWhatsApp().catch(() => {})}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        {t("qr.shareWhatsapp")}
      </button>
      <button
        type="button"
        onClick={() => downloadPdf().catch(() => {})}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-700 transition hover:bg-blue-100"
      >
        {t("qr.downloadPdf")}
      </button>
      <button
        type="button"
        onClick={() => downloadImage().catch(() => {})}
        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        {t("qr.downloadImage")}
      </button>
    </div>
  );
}
