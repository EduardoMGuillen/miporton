import { NextResponse } from "next/server";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDateTimeTegucigalpa(date: Date) {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: "America/Tegucigalpa",
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function safeFileName(value: string) {
  return value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "");
}

function ensurePage(doc: jsPDF, y: number, minSpace = 70) {
  if (y + minSpace <= 790) return y;
  doc.addPage();
  return 42;
}

function imageDataUrl(data: Uint8Array, mimeType: string | null) {
  const safeMime = mimeType || "image/jpeg";
  const base64 = Buffer.from(data).toString("base64");
  return `data:${safeMime};base64,${base64}`;
}

function imageFormat(mimeType: string | null) {
  if (mimeType?.includes("png")) return "PNG";
  return "JPEG";
}

type EntryRecord = {
  id: string;
  scannedAt: Date;
  exitedAt: Date | null;
  exitNote: string | null;
  reason: string;
  visitorName: string;
  residentName: string;
  guardName: string;
  idPhotoData: Uint8Array | null;
  idPhotoMimeType: string | null;
  idPhotoSize: number | null;
  platePhotoData: Uint8Array | null;
  platePhotoMimeType: string | null;
  platePhotoSize: number | null;
};

type DeliveryRecord = {
  id: string;
  createdAt: Date;
  note: string;
  residentName: string;
  guardName: string;
};

function buildResidentialReportPdf({
  residentialName,
  generatedAt,
  entries,
  deliveries,
}: {
  residentialName: string;
  generatedAt: Date;
  entries: EntryRecord[];
  deliveries: DeliveryRecord[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const contentWidth = 515;
  let y = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Reporte de entradas - ${residentialName}`, 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generado: ${formatDateTimeTegucigalpa(generatedAt)} (America/Tegucigalpa)`, 40, y);
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
    doc.text("Sin entradas registradas.", 40, y);
    y += 12;
  } else {
    entries.forEach((entry, index) => {
      y = ensurePage(doc, y, 130);
      const methodLabel = entry.reason.toLowerCase().includes("manual") ? "Manual" : "QR";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${entry.visitorName} (${methodLabel})`, 40, y);
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const metaLines = [
        `Entrada: ${formatDateTimeTegucigalpa(entry.scannedAt)}`,
        `Salida: ${entry.exitedAt ? formatDateTimeTegucigalpa(entry.exitedAt) : "Pendiente"}`,
        `Residente: ${entry.residentName}`,
        `Guardia: ${entry.guardName}`,
        `Registro: ${entry.id}`,
      ];
      metaLines.forEach((line) => {
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

      const hasIdImage = Boolean(entry.idPhotoData && entry.idPhotoData.length > 0);
      const hasPlateImage = Boolean(entry.platePhotoData && entry.platePhotoData.length > 0);
      if (hasIdImage || hasPlateImage) {
        y = ensurePage(doc, y, 140);
        let imageX = 40;
        if (hasIdImage && entry.idPhotoData) {
          try {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Evidencia ID", imageX, y);
            doc.addImage(
              imageDataUrl(entry.idPhotoData, entry.idPhotoMimeType),
              imageFormat(entry.idPhotoMimeType),
              imageX,
              y + 6,
              155,
              100,
            );
            imageX += 170;
          } catch {
            doc.setFont("helvetica", "italic");
            doc.text("No se pudo incrustar evidencia ID.", imageX, y + 14);
            imageX += 170;
          }
        }
        if (hasPlateImage && entry.platePhotoData) {
          try {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(9);
            doc.text("Evidencia placa", imageX, y);
            doc.addImage(
              imageDataUrl(entry.platePhotoData, entry.platePhotoMimeType),
              imageFormat(entry.platePhotoMimeType),
              imageX,
              y + 6,
              155,
              100,
            );
          } catch {
            doc.setFont("helvetica", "italic");
            doc.text("No se pudo incrustar evidencia placa.", imageX, y + 14);
          }
        }
        y += 114;
      } else {
        doc.setFont("helvetica", "italic");
        doc.text("Sin evidencia de imagen en este registro.", 40, y);
        y += 12;
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(40, y, 555, y);
      y += 10;
    });
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
    doc.text("Sin delivery registrados.", 40, y);
    y += 12;
  } else {
    deliveries.forEach((delivery, index) => {
      y = ensurePage(doc, y, 70);
      doc.setFont("helvetica", "bold");
      doc.text(`${index + 1}. ${delivery.residentName}`, 40, y);
      y += 11;
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${formatDateTimeTegucigalpa(delivery.createdAt)} | Guardia: ${delivery.guardName}`, 40, y);
      y += 11;
      const detailLines = doc.splitTextToSize(`Detalle: ${delivery.note}`, contentWidth);
      doc.text(detailLines, 40, y);
      y += detailLines.length * 10 + 6;
      doc.setDrawColor(226, 232, 240);
      doc.line(40, y, 555, y);
      y += 10;
    });
  }

  return doc.output("arraybuffer");
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [residentials, scans, deliveries] = await Promise.all([
    prisma.residential.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.qrScan.findMany({
      where: { isValid: true },
      orderBy: { scannedAt: "asc" },
      select: {
        id: true,
        scannedAt: true,
        exitedAt: true,
        exitNote: true,
        reason: true,
        idPhotoData: true,
        idPhotoMimeType: true,
        idPhotoSize: true,
        platePhotoData: true,
        platePhotoMimeType: true,
        platePhotoSize: true,
        code: {
          select: {
            visitorName: true,
            resident: { select: { fullName: true } },
            residential: { select: { id: true, name: true } },
          },
        },
        scanner: { select: { fullName: true } },
      },
    }),
    prisma.deliveryAnnouncement.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        note: true,
        residential: { select: { id: true, name: true } },
        resident: { select: { fullName: true } },
        guard: { select: { fullName: true } },
      },
    }),
  ]);

  const zip = new JSZip();
  const generatedAt = new Date();

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        generatedAt: generatedAt.toISOString(),
        generatedBy: session.fullName,
        generatedByUserId: session.userId,
        counts: {
          residentials: residentials.length,
          qrScans: scans.length,
          deliveries: deliveries.length,
          pdfReports: residentials.length,
        },
      },
      null,
      2,
    ),
  );

  const scansByResidential = new Map<string, EntryRecord[]>();
  scans.forEach((scan) => {
    const residentialId = scan.code.residential.id;
    const group = scansByResidential.get(residentialId) ?? [];
    group.push({
      id: scan.id,
      scannedAt: scan.scannedAt,
      exitedAt: scan.exitedAt,
      exitNote: scan.exitNote,
      reason: scan.reason,
      visitorName: scan.code.visitorName,
      residentName: scan.code.resident.fullName,
      guardName: scan.scanner.fullName,
      idPhotoData: scan.idPhotoData,
      idPhotoMimeType: scan.idPhotoMimeType,
      idPhotoSize: scan.idPhotoSize,
      platePhotoData: scan.platePhotoData,
      platePhotoMimeType: scan.platePhotoMimeType,
      platePhotoSize: scan.platePhotoSize,
    });
    scansByResidential.set(residentialId, group);
  });

  const deliveriesByResidential = new Map<string, DeliveryRecord[]>();
  deliveries.forEach((delivery) => {
    const residentialId = delivery.residential.id;
    const group = deliveriesByResidential.get(residentialId) ?? [];
    group.push({
      id: delivery.id,
      createdAt: delivery.createdAt,
      note: delivery.note,
      residentName: delivery.resident.fullName,
      guardName: delivery.guard.fullName,
    });
    deliveriesByResidential.set(residentialId, group);
  });

  residentials.forEach((residential) => {
    const reportPdf = buildResidentialReportPdf({
      residentialName: residential.name,
      generatedAt,
      entries: scansByResidential.get(residential.id) ?? [],
      deliveries: deliveriesByResidential.get(residential.id) ?? [],
    });
    const fileBase = safeFileName(residential.name) || residential.id;
    zip.file(`reportes-pdf/reporte-${fileBase}.pdf`, new Uint8Array(reportPdf));
  });

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const body = new Uint8Array(zipBuffer);

  const fileName = `mivisita-reports-backup-${generatedAt.toISOString().slice(0, 10)}.zip`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
