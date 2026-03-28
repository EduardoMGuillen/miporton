"use client";

import { jsPDF } from "jspdf";
import { useState } from "react";

type EntryItem = {
  recordId: string;
  entryDateLabel: string;
  exitDateLabel: string;
  exitStatusLabel: string;
  exitNote?: string;
  visitorName: string;
  residentName: string;
  guardName: string;
  method: string;
  reason: string;
  evidenceImageUrl?: string;
  plateImageUrl?: string;
};

type DeliveryItem = {
  dateLabel: string;
  residentName: string;
  guardName: string;
  note: string;
};

export function MonthlyAccessReportButton({
  reportTitle,
  monthLabel,
  entries,
  deliveries,
}: {
  reportTitle: string;
  monthLabel: string;
  entries: EntryItem[];
  deliveries: DeliveryItem[];
}) {
  const [isGenerating, setIsGenerating] = useState(false);

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

  function ensurePage(doc: jsPDF, y: number, minSpace = 70) {
    if (y + minSpace <= 790) return y;
    doc.addPage();
    return 42;
  }

  async function generate() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 42;
    const contentWidth = 515;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(reportTitle, 40, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Mes: ${monthLabel}`, 40, y);
    y += 14;
    doc.text(`Entradas: ${entries.length} | Delivery: ${deliveries.length}`, 40, y);
    y += 18;
    doc.setDrawColor(226, 232, 240);
    doc.line(40, y, 555, y);
    y += 16;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Entradas registradas", 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (entries.length === 0) {
      doc.text("Sin entradas registradas para este filtro.", 40, y);
      y += 12;
    } else {
      for (const [idx, entry] of entries.entries()) {
        y = ensurePage(doc, y, 130);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${idx + 1}. ${entry.visitorName} (${entry.method})`, 40, y);
        y += 12;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const meta = [
          `Entrada: ${entry.entryDateLabel}`,
          `Salida: ${entry.exitDateLabel} (${entry.exitStatusLabel})`,
          `Residente: ${entry.residentName}`,
          `Guardia: ${entry.guardName}`,
          `Registro: ${entry.recordId}`,
        ];
        meta.forEach((line) => {
          doc.text(line, 40, y);
          y += 11;
        });

        const reasonLines = doc.splitTextToSize(`Motivo: ${entry.reason}`, contentWidth);
        doc.text(reasonLines, 40, y);
        y += reasonLines.length * 10 + 4;

        if (entry.exitNote) {
          const exitNoteLines = doc.splitTextToSize(`Nota de salida: ${entry.exitNote}`, contentWidth);
          doc.text(exitNoteLines, 40, y);
          y += exitNoteLines.length * 10 + 4;
        }

        const [idImage, plateImage] = await Promise.all([
          entry.evidenceImageUrl ? imageUrlToDataUrl(entry.evidenceImageUrl) : Promise.resolve(null),
          entry.plateImageUrl ? imageUrlToDataUrl(entry.plateImageUrl) : Promise.resolve(null),
        ]);

        if (idImage || plateImage) {
          y = ensurePage(doc, y, 140);
          let imageX = 40;
          if (idImage) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Evidencia ID", imageX, y);
            doc.addImage(idImage, "JPEG", imageX, y + 6, 155, 100);
            imageX += 170;
          }
          if (plateImage) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Evidencia placa", imageX, y);
            doc.addImage(plateImage, "JPEG", imageX, y + 6, 155, 100);
          }
          y += 114;
        }

        doc.setDrawColor(226, 232, 240);
        doc.line(40, y, 555, y);
        y += 10;
      }
    }

    y = ensurePage(doc, y, 80);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Delivery registrados", 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (deliveries.length === 0) {
      doc.text("Sin delivery registrados para este filtro.", 40, y);
      y += 12;
    } else {
      deliveries.forEach((delivery, idx) => {
        y = ensurePage(doc, y, 70);
        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}. ${delivery.residentName}`, 40, y);
        y += 11;
        doc.setFont("helvetica", "normal");
        doc.text(`Fecha: ${delivery.dateLabel} | Guardia: ${delivery.guardName}`, 40, y);
        y += 11;
        const lines = doc.splitTextToSize(`Detalle: ${delivery.note}`, contentWidth);
        doc.text(lines, 40, y);
        y += lines.length * 10 + 6;
        doc.setDrawColor(226, 232, 240);
        doc.line(40, y, 555, y);
        y += 10;
      });
    }

    doc.save(`reporte-accesos-${monthLabel.replaceAll("/", "-")}.pdf`);
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setIsGenerating(true);
        try {
          await generate();
        } finally {
          setIsGenerating(false);
        }
      }}
      disabled={isGenerating}
      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
    >
      {isGenerating ? "Generando reporte..." : "Descargar reporte mensual (PDF)"}
    </button>
  );
}
