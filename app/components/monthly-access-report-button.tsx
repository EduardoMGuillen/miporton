"use client";

import { jsPDF } from "jspdf";
import { useState } from "react";

type EntryItem = {
  dateLabel: string;
  visitorName: string;
  residentName: string;
  guardName: string;
  method: string;
  reason: string;
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

  function generate() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 42;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(reportTitle, 40, y);
    y += 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Mes: ${monthLabel}`, 40, y);
    y += 14;
    doc.text(`Entradas: ${entries.length} | Delivery: ${deliveries.length}`, 40, y);
    y += 22;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Entradas registradas", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (entries.length === 0) {
      doc.text("Sin entradas registradas para este filtro.", 40, y);
      y += 12;
    } else {
      entries.forEach((entry, idx) => {
        const line = `${idx + 1}. ${entry.dateLabel} | Visita: ${entry.visitorName} | Residente: ${entry.residentName} | Guardia: ${entry.guardName} | Metodo: ${entry.method}`;
        const lines = doc.splitTextToSize(`${line} | Motivo: ${entry.reason}`, 520);
        doc.text(lines, 40, y);
        y += lines.length * 11 + 4;
        if (y > 760) {
          doc.addPage();
          y = 40;
        }
      });
    }

    y += 8;
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Delivery registrados", 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (deliveries.length === 0) {
      doc.text("Sin delivery registrados para este filtro.", 40, y);
      y += 12;
    } else {
      deliveries.forEach((delivery, idx) => {
        const line = `${idx + 1}. ${delivery.dateLabel} | Residente: ${delivery.residentName} | Guardia: ${delivery.guardName}`;
        const lines = doc.splitTextToSize(`${line} | Detalle: ${delivery.note}`, 520);
        doc.text(lines, 40, y);
        y += lines.length * 11 + 4;
        if (y > 760) {
          doc.addPage();
          y = 40;
        }
      });
    }

    doc.save(`reporte-accesos-${monthLabel.replaceAll("/", "-")}.pdf`);
  }

  return (
    <button
      type="button"
      onClick={() => {
        setIsGenerating(true);
        try {
          generate();
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
