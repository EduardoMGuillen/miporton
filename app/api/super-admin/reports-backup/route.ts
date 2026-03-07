import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type CsvValue = string | number | boolean | null | undefined;

function csvEscape(value: CsvValue) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(headers: string[], rows: CsvValue[][]) {
  const headerLine = headers.map((header) => csvEscape(header)).join(",");
  const rowLines = rows.map((row) => row.map((value) => csvEscape(value)).join(","));
  return [headerLine, ...rowLines].join("\n");
}

function mimeToExtension(mimeType: string | null) {
  if (!mimeType) return "bin";
  if (mimeType.includes("jpeg")) return "jpg";
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "bin";
}

function toIsoDate(value: Date) {
  return value.toISOString();
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [residentials, scans, deliveries, suggestions, contracts] = await Promise.all([
    prisma.residential.findMany({
      select: { id: true, name: true, supportPhone: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.qrScan.findMany({
      where: { isValid: true },
      orderBy: { scannedAt: "asc" },
      select: {
        id: true,
        scannedAt: true,
        reason: true,
        idPhotoData: true,
        idPhotoMimeType: true,
        idPhotoSize: true,
        platePhotoData: true,
        platePhotoMimeType: true,
        platePhotoSize: true,
        code: {
          select: {
            code: true,
            visitorName: true,
            description: true,
            hasVehicle: true,
            resident: { select: { fullName: true, email: true, houseNumber: true } },
            residential: { select: { id: true, name: true } },
          },
        },
        scanner: { select: { fullName: true, email: true } },
      },
    }),
    prisma.deliveryAnnouncement.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        note: true,
        residential: { select: { id: true, name: true } },
        resident: { select: { fullName: true, email: true, houseNumber: true } },
        guard: { select: { fullName: true, email: true } },
      },
    }),
    prisma.residentSuggestion.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        message: true,
        residential: { select: { id: true, name: true } },
        resident: { select: { fullName: true, email: true, houseNumber: true } },
      },
    }),
    prisma.serviceContract.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        residentialId: true,
        residentialName: true,
        legalRepresentative: true,
        representativeEmail: true,
        representativePhone: true,
        servicePlan: true,
        monthlyAmount: true,
        startsOn: true,
        endsOn: true,
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
          suggestions: suggestions.length,
          contracts: contracts.length,
        },
      },
      null,
      2,
    ),
  );

  zip.file(
    "reports/residentials.csv",
    toCsv(
      ["residentialId", "name", "supportPhone", "createdAt"],
      residentials.map((item) => [item.id, item.name, item.supportPhone, toIsoDate(item.createdAt)]),
    ),
  );

  zip.file(
    "reports/qr-scans.csv",
    toCsv(
      [
        "scanId",
        "scannedAt",
        "residentialId",
        "residentialName",
        "qrCode",
        "visitorName",
        "visitorDescription",
        "hasVehicle",
        "residentName",
        "residentEmail",
        "residentHouseNumber",
        "guardName",
        "guardEmail",
        "reason",
        "idPhotoSizeBytes",
        "platePhotoSizeBytes",
      ],
      scans.map((scan) => [
        scan.id,
        toIsoDate(scan.scannedAt),
        scan.code.residential.id,
        scan.code.residential.name,
        scan.code.code,
        scan.code.visitorName,
        scan.code.description,
        scan.code.hasVehicle ? "yes" : "no",
        scan.code.resident.fullName,
        scan.code.resident.email,
        scan.code.resident.houseNumber,
        scan.scanner.fullName,
        scan.scanner.email,
        scan.reason,
        scan.idPhotoSize,
        scan.platePhotoSize,
      ]),
    ),
  );

  zip.file(
    "reports/deliveries.csv",
    toCsv(
      [
        "deliveryId",
        "createdAt",
        "residentialId",
        "residentialName",
        "residentName",
        "residentEmail",
        "residentHouseNumber",
        "guardName",
        "guardEmail",
        "note",
      ],
      deliveries.map((delivery) => [
        delivery.id,
        toIsoDate(delivery.createdAt),
        delivery.residential.id,
        delivery.residential.name,
        delivery.resident.fullName,
        delivery.resident.email,
        delivery.resident.houseNumber,
        delivery.guard.fullName,
        delivery.guard.email,
        delivery.note,
      ]),
    ),
  );

  zip.file(
    "reports/suggestions.csv",
    toCsv(
      [
        "suggestionId",
        "createdAt",
        "residentialId",
        "residentialName",
        "residentName",
        "residentEmail",
        "residentHouseNumber",
        "message",
      ],
      suggestions.map((suggestion) => [
        suggestion.id,
        toIsoDate(suggestion.createdAt),
        suggestion.residential.id,
        suggestion.residential.name,
        suggestion.resident.fullName,
        suggestion.resident.email,
        suggestion.resident.houseNumber,
        suggestion.message,
      ]),
    ),
  );

  zip.file(
    "reports/service-contracts.csv",
    toCsv(
      [
        "contractId",
        "createdAt",
        "residentialId",
        "residentialName",
        "legalRepresentative",
        "representativeEmail",
        "representativePhone",
        "servicePlan",
        "monthlyAmountHNL",
        "startsOn",
        "endsOn",
      ],
      contracts.map((contract) => [
        contract.id,
        toIsoDate(contract.createdAt),
        contract.residentialId,
        contract.residentialName,
        contract.legalRepresentative,
        contract.representativeEmail,
        contract.representativePhone,
        contract.servicePlan,
        contract.monthlyAmount,
        toIsoDate(contract.startsOn),
        contract.endsOn ? toIsoDate(contract.endsOn) : null,
      ]),
    ),
  );

  for (const scan of scans) {
    if (scan.idPhotoData && scan.idPhotoData.length > 0) {
      const extension = mimeToExtension(scan.idPhotoMimeType);
      zip.file(`evidences/id/${scan.id}.${extension}`, Buffer.from(scan.idPhotoData));
    }
    if (scan.platePhotoData && scan.platePhotoData.length > 0) {
      const extension = mimeToExtension(scan.platePhotoMimeType);
      zip.file(`evidences/plate/${scan.id}.${extension}`, Buffer.from(scan.platePhotoData));
    }
  }

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
