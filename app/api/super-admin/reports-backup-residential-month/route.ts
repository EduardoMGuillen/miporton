import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REPORT_BACKUP_MAX_SCANS_PER_MONTH } from "@/lib/reports-backup-constants";
import {
  buildResidentialReportPdf,
  safeFileNameForReport,
  type ReportBackupDeliveryRecord,
  type ReportBackupEntryRecord,
} from "@/lib/reports-backup-pdf";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseMonth(value: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return {
    label: value,
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const residentialId = url.searchParams.get("residentialId")?.trim() ?? "";
  const monthParam = url.searchParams.get("month")?.trim() ?? null;

  if (!residentialId) {
    return NextResponse.json({ error: "Falta el parametro residentialId." }, { status: 400 });
  }

  const parsedMonth = parseMonth(monthParam);
  if (!parsedMonth) {
    return NextResponse.json({ error: "Mes invalido. Use el formato YYYY-MM (ej. 2026-05)." }, { status: 400 });
  }

  try {
    const residential = await prisma.residential.findUnique({
      where: { id: residentialId },
      select: { id: true, name: true },
    });
    if (!residential) {
      return NextResponse.json({ error: "Residencial no encontrada." }, { status: 404 });
    }

    const scanCount = await prisma.qrScan.count({
      where: {
        isValid: true,
        scannedAt: { gte: parsedMonth.start, lt: parsedMonth.end },
        code: { residentialId: residential.id },
      },
    });

    if (scanCount > REPORT_BACKUP_MAX_SCANS_PER_MONTH) {
      return NextResponse.json(
        {
          error: `Hay ${scanCount} entradas validas en ese mes (maximo ${REPORT_BACKUP_MAX_SCANS_PER_MONTH} por esta descarga).`,
        },
        { status: 400 },
      );
    }

    const [scans, deliveryRows] = await Promise.all([
      prisma.qrScan.findMany({
        where: {
          isValid: true,
          scannedAt: { gte: parsedMonth.start, lt: parsedMonth.end },
          code: { residentialId: residential.id },
        },
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
              description: true,
              resident: { select: { fullName: true } },
            },
          },
          scanner: { select: { fullName: true } },
        },
      }),
      prisma.deliveryAnnouncement.findMany({
        where: {
          residentialId: residential.id,
          createdAt: { gte: parsedMonth.start, lt: parsedMonth.end },
        },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          createdAt: true,
          note: true,
          resident: { select: { fullName: true } },
          guard: { select: { fullName: true } },
        },
      }),
    ]);

    const entries: ReportBackupEntryRecord[] = scans.map((scan) => ({
      id: scan.id,
      scannedAt: scan.scannedAt,
      exitedAt: scan.exitedAt,
      exitNote: scan.exitNote,
      reason: scan.reason,
      visitorName: scan.code.visitorName,
      visitorDescription: scan.code.description,
      residentName: scan.code.resident.fullName,
      guardName: scan.scanner.fullName,
      idPhotoData: scan.idPhotoData,
      idPhotoMimeType: scan.idPhotoMimeType,
      idPhotoSize: scan.idPhotoSize,
      platePhotoData: scan.platePhotoData,
      platePhotoMimeType: scan.platePhotoMimeType,
      platePhotoSize: scan.platePhotoSize,
    }));

    const deliveries: ReportBackupDeliveryRecord[] = deliveryRows.map((d) => ({
      id: d.id,
      createdAt: d.createdAt,
      note: d.note,
      residentName: d.resident.fullName,
      guardName: d.guard.fullName,
    }));

    const generatedAt = new Date();
    const reportPdf = buildResidentialReportPdf({
      residentialName: residential.name,
      generatedAt,
      entries,
      deliveries,
      embedEvidenceImages: true,
      periodLabel: `Mes: ${parsedMonth.label} (rango de fechas del calendario del servidor, coherente con Registros)`,
    });

    const base = safeFileNameForReport(residential.name) || "residencial";
    const fileName = `reporte-${base}-${parsedMonth.label}.pdf`;

    return new NextResponse(new Uint8Array(reportPdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al generar el PDF.";
    console.error("[reports-backup-residential-month]", error);
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
