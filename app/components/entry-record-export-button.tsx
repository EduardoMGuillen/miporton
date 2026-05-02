"use client";

import { jsPDF } from "jspdf";
import { useState } from "react";

type EntryRecordExportButtonProps = {
  recordId: string;
  visitorName: string;
  visitorDescription?: string | null;
  residentName: string;
  guardName: string;
  residentialName?: string;
  entryAtLabel: string;
  exitAtLabel: string;
  exitStatusLabel: string;
  exitNote?: string;
  methodLabel: string;
  evidenceLabel: string;
  reason: string;
  evidenceImageUrl?: string;
  plateImageUrl?: string;
};

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();

  return await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export function EntryRecordExportButton({
  recordId,
  visitorName,
  visitorDescription,
  residentName,
  guardName,
  residentialName,
  entryAtLabel,
  exitAtLabel,
  exitStatusLabel,
  exitNote,
  methodLabel,
  evidenceLabel,
  reason,
  evidenceImageUrl,
  plateImageUrl,
}: EntryRecordExportButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleExport() {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const evidenceImageData = evidenceImageUrl ? await imageUrlToDataUrl(evidenceImageUrl) : null;
      const plateImageData = plateImageUrl ? await imageUrlToDataUrl(plateImageUrl) : null;

      let y = 48;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Registro de acceso - MiVisita", 40, y);
      y += 24;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`ID de registro: ${recordId}`, 40, y);
      y += 20;
      doc.text(`Visita: ${visitorName}`, 40, y);
      y += 20;
      if (visitorDescription?.trim()) {
        const descLines = doc.splitTextToSize(`Descripcion del QR: ${visitorDescription.trim()}`, 515);
        doc.text(descLines, 40, y);
        y += descLines.length * 14 + 6;
      }
      doc.text(`Residente: ${residentName}`, 40, y);
      y += 20;
      doc.text(`Guardia: ${guardName}`, 40, y);
      y += 20;
      if (residentialName) {
        doc.text(`Residencial: ${residentialName}`, 40, y);
        y += 20;
      }
      doc.text(`Entrada: ${entryAtLabel}`, 40, y);
      y += 20;
      doc.text(`Salida: ${exitAtLabel} (${exitStatusLabel})`, 40, y);
      y += 20;
      doc.text(`Metodo: ${methodLabel}`, 40, y);
      y += 20;
      doc.text(`Evidencia: ${evidenceLabel}`, 40, y);
      y += 20;

      const reasonLines = doc.splitTextToSize(`Motivo: ${reason}`, 515);
      doc.text(reasonLines, 40, y);

      let detailsEndY = y + reasonLines.length * 14 + 18;
      if (exitNote) {
        const exitNoteLines = doc.splitTextToSize(`Nota de salida: ${exitNote}`, 515);
        doc.text(exitNoteLines, 40, detailsEndY);
        detailsEndY += exitNoteLines.length * 14 + 8;
      }

      const imageStartY = detailsEndY;
      if (evidenceImageData) {
        doc.setFont("helvetica", "bold");
        doc.text("Evidencia del ID", 40, imageStartY);
        doc.addImage(evidenceImageData, "JPEG", 40, imageStartY + 10, 260, 160);
        if (plateImageData) {
          doc.text("Evidencia de placa", 320, imageStartY);
          doc.addImage(plateImageData, "JPEG", 320, imageStartY + 10, 240, 160);
        }
      } else {
        doc.setFont("helvetica", "italic");
        doc.text("Este registro no tiene imagen de ID.", 40, imageStartY);
        if (plateImageData) {
          doc.setFont("helvetica", "bold");
          doc.text("Evidencia de placa", 40, imageStartY + 24);
          doc.addImage(plateImageData, "JPEG", 40, imageStartY + 34, 260, 160);
        }
      }

      doc.save(`registro-acceso-${recordId}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => handleExport().catch(() => {})}
      disabled={isGenerating}
      className="mt-3 w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
    >
      {isGenerating ? "Generando PDF..." : "Exportar registro en PDF"}
    </button>
  );
}
