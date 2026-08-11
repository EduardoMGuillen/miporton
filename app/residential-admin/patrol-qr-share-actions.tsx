"use client";

import { useMemo } from "react";
import { jsPDF } from "jspdf";

type Props = {
  qrDataUrl: string;
  zoneName: string;
  code: string;
  residentialName: string;
};

function safeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(" ", "-")
    .replaceAll(/[^a-z0-9-]/g, "");
}

async function buildStickerPdfBlob(props: Props) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 595, 88, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Sticker de patrullaje", 40, 52);

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(`Residencial: ${props.residentialName}`, 40, 120);
  doc.text(`Zona: ${props.zoneName}`, 40, 144);
  doc.text(`Codigo: MPP:${props.code}`, 40, 168);

  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(180, 200, 240, 240, 12, 12, "S");
  doc.addImage(props.qrDataUrl, "PNG", 200, 220, 200, 200);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(10);
  doc.text("Pega este QR en el punto de patrullaje. Solo el panel de guardia lo registra.", 40, 470);

  return doc.output("blob");
}

export function PatrolQrShareActions(props: Props) {
  const fileBase = useMemo(
    () => `patrullaje-${safeFilePart(props.zoneName) || "zona"}`,
    [props.zoneName],
  );

  async function downloadPdf() {
    const blob = await buildStickerPdfBlob(props);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileBase}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPng() {
    const link = document.createElement("a");
    link.href = props.qrDataUrl;
    link.download = `${fileBase}.png`;
    link.click();
  }

  async function share() {
    try {
      const blob = await (await fetch(props.qrDataUrl)).blob();
      const file = new File([blob], `${fileBase}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Patrullaje: ${props.zoneName}`,
          text: `QR de patrullaje — ${props.zoneName}`,
          files: [file],
        });
        return;
      }
    } catch {
      // fallback abajo
    }
    await downloadPng();
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => void share()}
        className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
      >
        Compartir
      </button>
      <button
        type="button"
        onClick={() => void downloadPng()}
        className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs font-medium text-indigo-700 transition hover:bg-indigo-100"
      >
        Descargar PNG
      </button>
      <button
        type="button"
        onClick={() => void downloadPdf()}
        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-xs font-medium text-blue-700 transition hover:bg-blue-100"
      >
        Descargar PDF
      </button>
    </div>
  );
}
