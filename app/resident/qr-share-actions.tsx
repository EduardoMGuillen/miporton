"use client";

import { jsPDF } from "jspdf";

type Props = {
  qrDataUrl: string;
  visitorName: string;
  code: string;
  validityLabel: string;
  validUntilLabel: string;
  residentialName: string;
  residentName: string;
};

function safeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll(/[^a-z0-9-]/g, "");
}

async function buildQrPdfBlob({
  qrDataUrl,
  visitorName,
  code,
  validityLabel,
  validUntilLabel,
  residentialName,
  residentName,
}: Props) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, 595, 96, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MiVisita - Pase de Visita", 40, 56);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Residencial: ${residentialName}`, 40, 130);
  doc.text(`Residente: ${residentName}`, 40, 154);
  doc.text(`Visita: ${visitorName}`, 40, 178);
  doc.text(`Validez: ${validityLabel}`, 40, 202);
  doc.text(`Expira: ${validUntilLabel}`, 40, 226);
  doc.text(`Codigo: MP:${code}`, 40, 250);

  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(330, 126, 220, 220, 12, 12, "S");
  doc.addImage(qrDataUrl, "PNG", 350, 146, 180, 180);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  doc.text(
    "Presentar este pase al guardia para validar acceso.",
    40,
    308,
  );

  return doc.output("blob");
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar el QR para la imagen."));
    image.src = dataUrl;
  });
}

async function buildQrImageBlob({
  qrDataUrl,
  visitorName,
  code,
  validityLabel,
  validUntilLabel,
  residentialName,
  residentName,
}: Props) {
  const width = 1200;
  const height = 1600;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo generar la imagen.");

  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);

  context.fillStyle = "#1d4ed8";
  context.fillRect(0, 0, width, 220);
  context.fillStyle = "#ffffff";
  context.font = "bold 62px Arial";
  context.fillText("MiVisita - Pase de Visita", 64, 132);

  context.fillStyle = "#0f172a";
  context.font = "500 40px Arial";
  context.fillText(`Residencial: ${residentialName}`, 64, 320);
  context.fillText(`Residente: ${residentName}`, 64, 390);
  context.fillText(`Visita: ${visitorName}`, 64, 460);
  context.fillText(`Validez: ${validityLabel}`, 64, 530);
  context.fillText(`Expira: ${validUntilLabel}`, 64, 600);
  context.fillText(`Codigo: MP:${code}`, 64, 670);

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
  context.fillText("Presentar este pase al guardia para validar acceso.", 120, 1490);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) throw new Error("No se pudo exportar la imagen.");
  return blob;
}

export function QrShareActions(props: Props) {
  const fileBaseName = `mivisita-pase-${safeFilePart(props.visitorName || "visita")}`;

  async function downloadPdf() {
    const blob = await buildQrPdfBlob(props);
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
    const blob = await buildQrPdfBlob(props);
    const file = new File([blob], `${fileBaseName}.pdf`, { type: "application/pdf" });

    const shareText = `Pase de visita MiVisita - ${props.visitorName}`;
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "MiVisita - Pase de visita",
        text: shareText,
        files: [file],
      });
      return;
    }

    await downloadPdf();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      `${shareText}. Te acabo de descargar el PDF para que lo adjuntes en WhatsApp.`,
    )}`;
    // Use top-level navigation to avoid popup blocking on Android browsers.
    window.location.href = whatsappUrl;
  }

  async function downloadImage() {
    const blob = await buildQrImageBlob(props);
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
        onClick={shareToWhatsApp}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        Compartir PDF por WhatsApp
      </button>
      <button
        onClick={downloadPdf}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-700 transition hover:bg-blue-100"
      >
        Descargar PDF
      </button>
      <button
        onClick={() => downloadImage().catch(() => {})}
        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        Descargar Imagen
      </button>
    </div>
  );
}
