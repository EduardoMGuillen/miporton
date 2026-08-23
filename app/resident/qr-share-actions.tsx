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
  rulesTitle: string;
  rule1: string;
  rule2: string;
  rule3: string;
  experience: string;
  nexusContact: string;
};

const LOGO_SRC = "/512X512.png";
const STICKER_WIDTH = 1400;
const STICKER_HEIGHT = 1920;

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

function drawPhoneQrIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = "#0f172a";
  ctx.fillStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  roundRect(ctx, cx - 24, cy - 42, 48, 78, 8);
  ctx.stroke();
  roundRect(ctx, cx - 16, cy - 30, 32, 32, 4);
  ctx.stroke();
  ctx.fillRect(cx - 10, cy - 24, 9, 9);
  ctx.fillRect(cx + 1, cy - 24, 9, 9);
  ctx.fillRect(cx - 10, cy - 13, 9, 9);
  ctx.fillRect(cx + 1, cy - 13, 9, 9);
  ctx.beginPath();
  ctx.arc(cx, cy + 24, 4, 0, Math.PI * 2);
  ctx.stroke();
  roundRect(ctx, cx - 54, cy - 8, 28, 22, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 44, cy + 3, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 37, cy - 1);
  ctx.lineTo(cx - 30, cy - 1);
  ctx.moveTo(cx - 37, cy + 6);
  ctx.lineTo(cx - 30, cy + 6);
  ctx.stroke();
  ctx.restore();
}

function drawPedestrianPetIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx - 20, cy - 24, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 20, cy - 14);
  ctx.lineTo(cx - 20, cy + 14);
  ctx.moveTo(cx - 20, cy - 4);
  ctx.lineTo(cx - 36, cy + 10);
  ctx.moveTo(cx - 20, cy - 4);
  ctx.lineTo(cx - 2, cy + 4);
  ctx.moveTo(cx - 20, cy + 14);
  ctx.lineTo(cx - 32, cy + 36);
  ctx.moveTo(cx - 20, cy + 14);
  ctx.lineTo(cx - 8, cy + 36);
  ctx.moveTo(cx - 2, cy + 4);
  ctx.lineTo(cx + 24, cy + 16);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 32, cy + 20, 16, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 44, cy + 10, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + 20, cy + 28);
  ctx.lineTo(cx + 20, cy + 38);
  ctx.moveTo(cx + 30, cy + 30);
  ctx.lineTo(cx + 30, cy + 40);
  ctx.moveTo(cx + 40, cy + 28);
  ctx.lineTo(cx + 40, cy + 38);
  ctx.stroke();
  ctx.restore();
}

function drawCallIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = "#ffffff";
  ctx.fill(
    new Path2D(
      "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
    ),
  );
  ctx.restore();
}

function drawModerateSpeedIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = "#0f172a";
  ctx.fillStyle = "#0f172a";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 34, Math.PI * 1.05, Math.PI * -0.05);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx + 10, cy - 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 32, cy + 28);
  ctx.lineTo(cx - 18, cy + 28);
  ctx.lineTo(cx - 10, cy + 16);
  ctx.lineTo(cx + 16, cy + 16);
  ctx.lineTo(cx + 26, cy + 28);
  ctx.lineTo(cx + 36, cy + 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 12, cy + 28, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 18, cy + 28, 6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Sticker: logo, visita, residencial, anunciante, expiracion (si aplica), QR e indicaciones. */
export async function buildVisitStickerPngBlob(props: Props, labels: StickerLabels): Promise<Blob> {
  const width = STICKER_WIDTH;
  const height = STICKER_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas no disponible");

  const hasExpiration = props.hasExpiration ?? true;

  const [logo, qrImage] = await Promise.all([
    loadImage(LOGO_SRC).catch(() => null),
    loadImage(props.qrDataUrl),
  ]);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (logo) {
    const logoSize = 128;
    const logoX = width / 2 - logoSize / 2;
    const logoY = 32;
    roundRect(ctx, logoX, logoY, logoSize, logoSize, 28);
    ctx.save();
    ctx.clip();
    ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
    ctx.restore();
  } else {
    ctx.fillStyle = "#1d4ed8";
    ctx.font = "bold 36px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MiVisita", width / 2, 100);
  }

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 48px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  const nameLines = wrapLines(ctx, props.visitorName || "Visita", width - 120, 2);
  const nameStartY = 328;
  nameLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, nameStartY + index * 52);
  });

  let cursorY = nameStartY + nameLines.length * 52 + 22;

  ctx.fillStyle = "#0f172a";
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
    const wrapped = wrapLines(ctx, meta, width - 140, 1);
    ctx.fillText(wrapped[0] ?? "", width / 2, cursorY);
    cursorY += 34;
  }

  const headerBottom = cursorY + 16;
  const qrOuter = 740;
  const qrX = (width - qrOuter) / 2;
  const qrY = headerBottom;
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

  const urlBoxW = 560;
  const urlBoxH = 58;
  const urlBoxX = (width - urlBoxW) / 2;
  const urlBoxY = qrY + qrOuter + 18;
  roundRect(ctx, urlBoxX, urlBoxY, urlBoxW, urlBoxH, 14);
  ctx.fillStyle = "#1d4ed8";
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("www.MiVisita.app", width / 2, urlBoxY + urlBoxH / 2);
  ctx.textBaseline = "alphabetic";

  const footerHeight = 168;
  const footerY = height - footerHeight;
  const rulesTop = urlBoxY + urlBoxH + 34;

  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 380, rulesTop - 26);
  ctx.lineTo(width / 2 + 380, rulesTop - 26);
  ctx.stroke();

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 24px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(labels.rulesTitle.toUpperCase(), width / 2, rulesTop);

  const rules = [
    { text: labels.rule1, draw: drawPhoneQrIcon, iconDx: 10 },
    { text: labels.rule2, draw: drawPedestrianPetIcon, iconDx: 6 },
    { text: labels.rule3, draw: drawModerateSpeedIcon, iconDx: 0 },
  ];
  const colWidth = 300;
  const clusterWidth = colWidth * 3;
  const rulesStartX = (width - clusterWidth) / 2;
  rules.forEach((rule, index) => {
    const cx = rulesStartX + colWidth * index + colWidth / 2;
    rule.draw(ctx, cx + rule.iconDx, rulesTop + 78);
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 21px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    const lines = wrapLines(ctx, rule.text, colWidth - 12, 3);
    lines.forEach((line, lineIndex) => {
      ctx.fillText(line, cx, rulesTop + 150 + lineIndex * 26);
    });
  });

  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(0, footerY, width, footerHeight);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 28px Arial, Helvetica, sans-serif";
  const experienceLines = wrapLines(ctx, labels.experience, width - 120, 2);
  const footerTextBlock = experienceLines.length * 34 + 36;
  let footerTextY = footerY + (footerHeight - footerTextBlock) / 2 + 28;
  experienceLines.forEach((line) => {
    ctx.fillText(line, width / 2, footerTextY);
    footerTextY += 34;
  });
  ctx.font = "bold 30px Arial, Helvetica, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const phoneText = labels.nexusContact;
  const iconSize = 34;
  const iconGap = 12;
  const phoneWidth = ctx.measureText(phoneText).width;
  const groupWidth = iconSize + iconGap + phoneWidth;
  const groupX = (width - groupWidth) / 2;
  drawCallIcon(ctx, groupX + iconSize / 2, footerTextY + 8, iconSize);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(phoneText, groupX + iconSize + iconGap, footerTextY + 8);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

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

  const ratio = STICKER_HEIGHT / STICKER_WIDTH;
  const maxW = pageW - 48;
  const maxH = pageH - 48;
  let stickerW = maxW;
  let stickerH = stickerW * ratio;
  if (stickerH > maxH) {
    stickerH = maxH;
    stickerW = stickerH / ratio;
  }
  const stickerX = (pageW - stickerW) / 2;
  const stickerY = (pageH - stickerH) / 2;
  doc.addImage(stickerDataUrl, "PNG", stickerX, stickerY, stickerW, stickerH, undefined, "NONE");

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
      rulesTitle: t("qr.rulesTitle"),
      rule1: t("qr.ruleShowId"),
      rule2: t("qr.rulePedestrian"),
      rule3: t("qr.ruleSpeed"),
      experience: t("qr.experience"),
      nexusContact: t("qr.nexusContact"),
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
