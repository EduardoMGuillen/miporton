import { NextResponse } from "next/server";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Evita OOM y timeouts: Buffer no existe en Edge; el ZIP usa APIs de Node. */
export const runtime = "nodejs";
export const maxDuration = 300;

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
  visitorDescription: string | null;
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
  embedEvidenceImages,
}: {
  residentialName: string;
  generatedAt: Date;
  entries: EntryRecord[];
  deliveries: DeliveryRecord[];
  /** false = PDF liviano para backup global (sin cargar bytes de fotos en servidor). */
  embedEvidenceImages: boolean;
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
      if (entry.visitorDescription?.trim()) {
        const descLines = doc.splitTextToSize(
          `Descripcion del QR: ${entry.visitorDescription.trim()}`,
          contentWidth,
        );
        doc.text(descLines, 40, y);
        y += descLines.length * 10 + 4;
      }
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

      const hasIdBytes = Boolean(entry.idPhotoData && entry.idPhotoData.length > 0);
      const hasPlateBytes = Boolean(entry.platePhotoData && entry.platePhotoData.length > 0);
      const hasIdMeta = Boolean(entry.idPhotoSize && entry.idPhotoSize > 0);
      const hasPlateMeta = Boolean(entry.platePhotoSize && entry.platePhotoSize > 0);

      if (embedEvidenceImages && (hasIdBytes || hasPlateBytes)) {
        y = ensurePage(doc, y, 140);
        let imageX = 40;
        if (hasIdBytes && entry.idPhotoData) {
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
        if (hasPlateBytes && entry.platePhotoData) {
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
      } else if (!embedEvidenceImages && (hasIdMeta || hasPlateMeta)) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const parts: string[] = [];
        if (hasIdMeta) {
          parts.push(`Evidencia ID en sistema (${entry.idPhotoSize} bytes, no incrustada en este PDF)`);
        }
        if (hasPlateMeta) {
          parts.push(`Evidencia placa en sistema (${entry.platePhotoSize} bytes, no incrustada en este PDF)`);
        }
        const evLines = doc.splitTextToSize(parts.join(" | "), contentWidth);
        doc.text(evLines, 40, y);
        y += evLines.length * 10 + 4;
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

/** Sin bytes de imagen: el backup ZIP aguanta hosting con poco tiempo/RAM; las fotos van en backup de BD. */
const scanSelect = {
  id: true,
  scannedAt: true,
  exitedAt: true,
  exitNote: true,
  reason: true,
  idPhotoMimeType: true,
  idPhotoSize: true,
  platePhotoMimeType: true,
  platePhotoSize: true,
  code: {
    select: {
      visitorName: true,
      description: true,
      resident: { select: { fullName: true } },
    },
  },
  scanner: { select: { fullName: true } },
} as const;

function mapScanToEntry(
  scan: {
    id: string;
    scannedAt: Date;
    exitedAt: Date | null;
    exitNote: string | null;
    reason: string;
    idPhotoMimeType: string | null;
    idPhotoSize: number | null;
    platePhotoMimeType: string | null;
    platePhotoSize: number | null;
    code: {
      visitorName: string;
      description: string | null;
      resident: { fullName: string };
    };
    scanner: { fullName: string };
  },
): EntryRecord {
  return {
    id: scan.id,
    scannedAt: scan.scannedAt,
    exitedAt: scan.exitedAt,
    exitNote: scan.exitNote,
    reason: scan.reason,
    visitorName: scan.code.visitorName,
    visitorDescription: scan.code.description,
    residentName: scan.code.resident.fullName,
    guardName: scan.scanner.fullName,
    idPhotoData: null,
    idPhotoMimeType: scan.idPhotoMimeType,
    idPhotoSize: scan.idPhotoSize,
    platePhotoData: null,
    platePhotoMimeType: scan.platePhotoMimeType,
    platePhotoSize: scan.platePhotoSize,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const [residentials, deliveries] = await Promise.all([
      prisma.residential.findMany({
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
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

    let totalQrScans = 0;
    const zip = new JSZip();
    const generatedAt = new Date();

    for (const residential of residentials) {
      const scans = await prisma.qrScan.findMany({
        where: { isValid: true, code: { residentialId: residential.id } },
        orderBy: { scannedAt: "asc" },
        select: scanSelect,
      });
      totalQrScans += scans.length;
      const entries = scans.map(mapScanToEntry);
      const reportPdf = buildResidentialReportPdf({
        residentialName: residential.name,
        generatedAt,
        entries,
        deliveries: deliveriesByResidential.get(residential.id) ?? [],
        embedEvidenceImages: false,
      });
      const namePart = safeFileName(residential.name) || "residencial";
      const fileBase = `${namePart}-${residential.id.slice(0, 10)}`;
      zip.file(`reportes-pdf/reporte-${fileBase}.pdf`, new Uint8Array(reportPdf));
    }

    zip.file(
      "manifest.json",
      JSON.stringify(
        {
          generatedAt: generatedAt.toISOString(),
          generatedBy: session.fullName,
          generatedByUserId: session.userId,
          counts: {
            residentials: residentials.length,
            qrScans: totalQrScans,
            deliveries: deliveries.length,
            pdfReports: residentials.length,
          },
        },
        null,
        2,
      ),
    );

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al generar el backup.";
    console.error("[reports-backup]", error);
    return NextResponse.json(
      {
        error:
          message.length > 400
            ? `${message.slice(0, 400)}... (revisa logs del servidor)`
            : message,
      },
      { status: 500 },
    );
  }
}
