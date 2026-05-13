"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";
import { useResidentT } from "@/app/resident/resident-i18n-context";

type Props = {
  qrDataUrl: string;
  visitorName: string;
  code: string;
  validityLabel: string;
  validUntilLabel: string;
  residentialName: string;
  residentName: string;
};

type QrPdfFieldLabels = {
  title: string;
  residential: string;
  resident: string;
  visit: string;
  validity: string;
  expires: string;
  code: string;
  footer: string;
};

function safeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll(/[^a-z0-9-]/g, "");
}

async function buildQrPdfBlob(props: Props, labels: QrPdfFieldLabels) {
  const { qrDataUrl, visitorName, code, validityLabel, validUntilLabel, residentialName, residentName } = props;
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 595, 96, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(labels.title, 40, 56);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`${labels.residential}: ${residentialName}`, 40, 130);
  doc.text(`${labels.resident}: ${residentName}`, 40, 154);
  doc.text(`${labels.visit}: ${visitorName}`, 40, 178);
  doc.text(`${labels.validity}: ${validityLabel}`, 40, 202);
  doc.text(`${labels.expires}: ${validUntilLabel}`, 40, 226);
  doc.text(`${labels.code}: MP:${code}`, 40, 250);

  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(330, 126, 220, 220, 12, 12, "S");
  doc.addImage(qrDataUrl, "PNG", 350, 146, 180, 180);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  doc.text(labels.footer, 40, 308);

  return doc.output("blob");
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("QR load failed"));
    image.src = dataUrl;
  });
}

async function buildQrImageBlob(props: Props, labels: QrPdfFieldLabels) {
  const { qrDataUrl, visitorName, code, validityLabel, validUntilLabel, residentialName, residentName } = props;
  const width = 1200;
  const height = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas error");

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#1d4ed8";
  context.fillRect(0, 0, width, 220);
  context.fillStyle = "#ffffff";
  context.font = "bold 62px Arial";
  context.fillText(labels.title, 64, 132);

  context.fillStyle = "#0f172a";
  context.font = "500 40px Arial";
  context.fillText(`${labels.residential}: ${residentialName}`, 64, 320);
  context.fillText(`${labels.resident}: ${residentName}`, 64, 390);
  context.fillText(`${labels.visit}: ${visitorName}`, 64, 460);
  context.fillText(`${labels.validity}: ${validityLabel}`, 64, 530);
  context.fillText(`${labels.expires}: ${validUntilLabel}`, 64, 600);
  context.fillText(`${labels.code}: MP:${code}`, 64, 670);

  context.strokeStyle = "#cbd5e1";
  context.lineWidth = 4;
  const qrCardX = 270;
  const qrCardY = 760;
  const qrCardSize = 660;
  context.strokeRect(qrCardX, qrCardY, qrCardSize, qrCardSize);
  context.fillStyle = "#ffffff";
  context.fillRect(qrCardX + 16, qrCardY + 16, qrCardSize - 32, qrCardSize - 32);

  const qrImage = await loadImageFromDataUrl(qrDataUrl);
  context.drawImage(qrImage, qrCardX + 40, qrCardY + 40, qrCardSize - 80, qrCardSize - 80);

  context.fillStyle = "#475569";
  context.font = "500 30px Arial";
  context.fillText(labels.footer, 120, 1490);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) throw new Error("Export failed");
  return blob;
}

export function QrShareActions(props: Props) {
  const { t } = useResidentT();
  const pdfLabels = useMemo<QrPdfFieldLabels>(
    () => ({
      title: t("qr.pdfTitle"),
      residential: t("qr.pdfResidential"),
      resident: t("qr.pdfResident"),
      visit: t("qr.pdfVisit"),
      validity: t("qr.pdfValidity"),
      expires: t("qr.pdfExpires"),
      code: t("qr.pdfCode"),
      footer: t("qr.pdfFooter"),
    }),
    [t],
  );

  const fileBaseName = `mivisita-pase-${safeFilePart(props.visitorName || "visita")}`;

  async function downloadPdf() {
    const blob = await buildQrPdfBlob(props, pdfLabels);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function shareToWhatsApp() {
    const blob = await buildQrPdfBlob(props, pdfLabels);
    const file = new File([blob], `${fileBaseName}.pdf`, { type: "application/pdf" });

    const shareText = t("qr.shareText", { name: props.visitorName });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: t("qr.shareTitle"),
        text: shareText,
        files: [file],
      });
      return;
    }

    await downloadPdf();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(t("qr.shareFallback", { text: shareText }))}`;
    window.location.href = whatsappUrl;
  }

  async function downloadImage() {
    const blob = await buildQrImageBlob(props, pdfLabels);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
