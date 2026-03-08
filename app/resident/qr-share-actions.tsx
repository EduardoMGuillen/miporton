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

  function downloadImage() {
    const a = document.createElement("a");
    a.href = props.qrDataUrl;
    a.download = `${fileBaseName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
        onClick={downloadImage}
        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        Descargar Imagen
      </button>
    </div>
  );
}
