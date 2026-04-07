import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Allow long runs on Vercel Pro+; Hobby stays capped by plan (10s). */
export const maxDuration = 60;
export const runtime = "nodejs";

const QR_SCAN_BATCH = 150;

function toIsoOrNull(value: Date | null) {
  return value ? value.toISOString() : null;
}

function mimeToExt(mime: string | null): string {
  if (!mime) return ".bin";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  return ".bin";
}

function bufferFromScanPhoto(value: unknown): Buffer | null {
  if (value == null) return null;
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  return null;
}

type QrScanExportRow = {
  id: string;
  scannedAt: string;
  exitedAt: string | null;
  exitNote: string | null;
  isValid: boolean;
  reason: string;
  idPhotoMimeType: string | null;
  idPhotoSize: number | null;
  idCapturedAt: string | null;
  platePhotoMimeType: string | null;
  platePhotoSize: number | null;
  codeId: string;
  scannerId: string;
  /** Relative path inside ZIP, or null if no file */
  idPhotoFile: string | null;
  platePhotoFile: string | null;
};

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const generatedAt = new Date();
    const zip = new JSZip();

    const [
      residentials,
      users,
      qrCodes,
      pushSubscriptions,
      zones,
      zoneReservations,
      zoneBlocks,
      deliveries,
      adminAnnouncements,
      adminAnnouncementRecipients,
      serviceContracts,
      residentSuggestions,
      qrScanTotal,
    ] = await Promise.all([
      prisma.residential.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.qrCode.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.pushSubscription.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.zone.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.zoneReservation.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.zoneBlock.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.deliveryAnnouncement.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.adminAnnouncement.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.adminAnnouncementRecipient.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.serviceContract.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.residentSuggestion.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.qrScan.count(),
    ]);

    const serializedQrScans: QrScanExportRow[] = [];
    let skip = 0;

    while (skip < qrScanTotal) {
      const batch = await prisma.qrScan.findMany({
        orderBy: { scannedAt: "asc" },
        skip,
        take: QR_SCAN_BATCH,
      });

      if (batch.length === 0) break;

      for (const scan of batch) {
        const idBuf = bufferFromScanPhoto(scan.idPhotoData as unknown);
        const plateBuf = bufferFromScanPhoto(scan.platePhotoData as unknown);
        const idExt = mimeToExt(scan.idPhotoMimeType);
        const plateExt = mimeToExt(scan.platePhotoMimeType);
        const idPhotoFile = idBuf
          ? `evidence/${scan.id}/id${idExt}`
          : null;
        const platePhotoFile = plateBuf
          ? `evidence/${scan.id}/plate${plateExt}`
          : null;

        serializedQrScans.push({
          id: scan.id,
          scannedAt: scan.scannedAt.toISOString(),
          exitedAt: toIsoOrNull(scan.exitedAt),
          exitNote: scan.exitNote,
          isValid: scan.isValid,
          reason: scan.reason,
          idPhotoMimeType: scan.idPhotoMimeType,
          idPhotoSize: scan.idPhotoSize,
          idCapturedAt: toIsoOrNull(scan.idCapturedAt),
          platePhotoMimeType: scan.platePhotoMimeType,
          platePhotoSize: scan.platePhotoSize,
          codeId: scan.codeId,
          scannerId: scan.scannerId,
          idPhotoFile,
          platePhotoFile,
        });

        if (idBuf && idPhotoFile) {
          zip.file(idPhotoFile, idBuf, { compression: "STORE" });
        }
        if (plateBuf && platePhotoFile) {
          zip.file(platePhotoFile, plateBuf, { compression: "STORE" });
        }
      }

      skip += batch.length;
    }

    zip.file("data/residentials.json", JSON.stringify(residentials, null, 2));
    zip.file("data/users.json", JSON.stringify(users, null, 2));
    zip.file("data/qr-codes.json", JSON.stringify(qrCodes, null, 2));
    zip.file("data/qr-scans.json", JSON.stringify(serializedQrScans, null, 2));
    zip.file("data/push-subscriptions.json", JSON.stringify(pushSubscriptions, null, 2));
    zip.file("data/zones.json", JSON.stringify(zones, null, 2));
    zip.file("data/zone-reservations.json", JSON.stringify(zoneReservations, null, 2));
    zip.file("data/zone-blocks.json", JSON.stringify(zoneBlocks, null, 2));
    zip.file("data/delivery-announcements.json", JSON.stringify(deliveries, null, 2));
    zip.file("data/admin-announcements.json", JSON.stringify(adminAnnouncements, null, 2));
    zip.file(
      "data/admin-announcement-recipients.json",
      JSON.stringify(adminAnnouncementRecipients, null, 2),
    );
    zip.file("data/service-contracts.json", JSON.stringify(serviceContracts, null, 2));
    zip.file("data/resident-suggestions.json", JSON.stringify(residentSuggestions, null, 2));

    zip.file(
      "manifest.json",
      JSON.stringify(
        {
          generatedAt: generatedAt.toISOString(),
          generatedBy: session.fullName,
          generatedByUserId: session.userId,
          scope: "full-database-backup",
          backupFormatVersion: 2,
          qrScanEvidenceStorage: "zip-binary-per-scan",
          qrScanEvidenceNote:
            "Fotos ID/placa estan en carpetas evidence/<scanId>/ como archivos binarios; data/qr-scans.json referencia idPhotoFile y platePhotoFile.",
          counts: {
            residentials: residentials.length,
            users: users.length,
            qrCodes: qrCodes.length,
            qrScans: serializedQrScans.length,
            pushSubscriptions: pushSubscriptions.length,
            zones: zones.length,
            zoneReservations: zoneReservations.length,
            zoneBlocks: zoneBlocks.length,
            deliveries: deliveries.length,
            adminAnnouncements: adminAnnouncements.length,
            adminAnnouncementRecipients: adminAnnouncementRecipients.length,
            serviceContracts: serviceContracts.length,
            residentSuggestions: residentSuggestions.length,
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
    const fileName = `mivisita-database-backup-${generatedAt.toISOString().slice(0, 10)}.zip`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[database-backup]", error);
    return NextResponse.json(
      {
        error:
          "No se pudo generar el backup de base de datos. Reintenta en unos minutos. Si persiste, puede ser por volumen de datos o limite de tiempo del plan de hosting; el backup PDF suele ser mas liviano.",
      },
      { status: 500 },
    );
  }
}
