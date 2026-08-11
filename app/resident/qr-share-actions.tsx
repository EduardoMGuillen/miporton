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
  hasVehicle: boolean;
  /** Si es false (p. ej. INFINITE), no se muestra fecha de expiracion. */
  hasExpiration?: boolean;
};

type StickerLabels = {
  residential: string;
  announcedBy: string;
  expires: string;
  accessType: string;
};

const LOGO_SRC = "/logo.png";
const STICKER_SIZE = 1400;

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

/** Sticker: logo, visita, residencial, anunciante, expiracion (si aplica) y QR. */
async function buildVisitStickerPngBlob(props: Props, labels: StickerLabels): Promise<Blob> {
  const size = STICKER_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const hasExpiration = props.hasExpiration ?? true;

  const [logo, qrImage] = await Promise.all([
    loadImage(LOGO_SRC).catch(() => null),
    loadImage(props.qrDataUrl),
  ]);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  if (logo) {
    const logoSize = 100;
    const logoX = size / 2 - logoSize / 2;
    const logoY = 44;
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
    ctx.fillText(line, size / 2, nameStartY + index * 52);
  });

  let cursorY = nameStartY + nameLines.length * 52 + 22;

  ctx.fillStyle = "#475569";
  ctx.font = "500 26px Arial, Helvetica, sans-serif";
  const metaLines = [
    `${labels.residential}: ${props.residentialName}`,
    `${labels.announcedBy}: ${props.residentName}`,
    labels.accessType,
  ];
  if (hasExpiration && props.validUntilLabel.trim()) {
    metaLines.push(`${labels.expires}: ${props.validUntilLabel}`);
  }

  for (const meta of metaLines) {
    const wrapped = wrapLines(ctx, meta, size - 140, 1);
    ctx.fillText(wrapped[0] ?? "", size / 2, cursorY);
    cursorY += 34;
  }

  const headerBottom = cursorY + 16;
  const bottomPad = 64;
  const maxQr = size - headerBottom - bottomPad;
  const qrOuter = Math.min(860, maxQr);
  const qrX = (size - qrOuter) / 2;
  const qrY = headerBottom + Math.max(0, (maxQr - qrOuter) / 2);
  const qrPad = 18;

  roundRect(ctx, qrX, qrY, qrOuter, qrOuter, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(qrImage, qrX + qrPad, qrY + qrPad, qrOuter - qrPad * 2, qrOuter - qrPad * 2);
  ctx.imageSmoothingEnabled = true;

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

async function buildVisitStickerPdfBlob(props: Props, labels: StickerLabels): Promise<Blob> {
  const stickerBlob = await buildVisitStickerPngBlob(props, labels);
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

  const stickerPt = Math.min(480, pageW - 72, pageH - 72);
  const stickerX = (pageW - stickerPt) / 2;
  const stickerY = (pageH - stickerPt) / 2;
  doc.addImage(stickerDataUrl, "PNG", stickerX, stickerY, stickerPt, stickerPt, undefined, "NONE");

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
  const stickerLabels: StickerLabels = useMemo(
    () => ({
      residential: t("qr.pdfResidential"),
      announcedBy: t("qr.announcedBy"),
      expires: t("qr.pdfExpires"),
      accessType: props.hasVehicle ? t("home.accessVehicle") : t("home.accessPeatonal"),
    }),
    [t, props.hasVehicle],
  );

  async function downloadPdf() {
    const blob = await buildVisitStickerPdfBlob(props, stickerLabels);
    triggerDownload(blob, `${fileBaseName}.pdf`);
  }

  async function downloadImage() {
    const blob = await buildVisitStickerPngBlob(props, stickerLabels);
    triggerDownload(blob, `${fileBaseName}.png`);
  }

  async function shareToWhatsApp() {
    const shareText = t("qr.shareText", { name: props.visitorName });
    try {
      const blob = await buildVisitStickerPngBlob(props, stickerLabels);
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
