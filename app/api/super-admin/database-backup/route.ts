import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function toBase64(value: Uint8Array | Buffer | null) {
  if (!value) return null;
  return Buffer.from(value).toString("base64");
}

function toIsoOrNull(value: Date | null) {
  return value ? value.toISOString() : null;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [
    residentials,
    users,
    qrCodes,
    qrScans,
    pushSubscriptions,
    zones,
    zoneReservations,
    zoneBlocks,
    deliveries,
    adminAnnouncements,
    adminAnnouncementRecipients,
    serviceContracts,
    residentSuggestions,
  ] = await Promise.all([
    prisma.residential.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.qrCode.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.qrScan.findMany({ orderBy: { scannedAt: "asc" } }),
    prisma.pushSubscription.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.zone.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.zoneReservation.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.zoneBlock.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.deliveryAnnouncement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.adminAnnouncement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.adminAnnouncementRecipient.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.serviceContract.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.residentSuggestion.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const serializedQrScans = qrScans.map((scan) => ({
    ...scan,
    scannedAt: scan.scannedAt.toISOString(),
    idCapturedAt: toIsoOrNull(scan.idCapturedAt),
    idPhotoDataBase64: toBase64(scan.idPhotoData as unknown as Uint8Array | null),
    platePhotoDataBase64: toBase64(scan.platePhotoData as unknown as Uint8Array | null),
    idPhotoData: undefined,
    platePhotoData: undefined,
  }));

  const zip = new JSZip();
  const generatedAt = new Date();
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        generatedAt: generatedAt.toISOString(),
        generatedBy: session.fullName,
        generatedByUserId: session.userId,
        scope: "full-database-backup",
        counts: {
          residentials: residentials.length,
          users: users.length,
          qrCodes: qrCodes.length,
          qrScans: qrScans.length,
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
}
