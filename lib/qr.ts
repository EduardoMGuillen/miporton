import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export function calculateValidityWindow(validityType: "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS") {
  const validFrom = new Date();
  if (validityType === "SINGLE_USE") {
    return { validFrom, validUntil: addDays(validFrom, 3), maxUses: 1 };
  }
  if (validityType === "ONE_DAY") {
    return { validFrom, validUntil: addDays(validFrom, 1), maxUses: 9999 };
  }
  return { validFrom, validUntil: addDays(validFrom, 3), maxUses: 9999 };
}

export async function validateAndConsumeQr({
  scannedCode,
  scannerId,
  scannerResidentialId,
  consume = true,
  scanEvidence,
}: {
  scannedCode: string;
  scannerId: string;
  scannerResidentialId: string | null;
  consume?: boolean;
  scanEvidence?: {
    idPhotoData: Uint8Array;
    idPhotoMimeType: string;
    idPhotoSize: number;
  };
}) {
  const code = scannedCode.startsWith("MP:") ? scannedCode.slice(3) : scannedCode;

  const qr = await prisma.qrCode.findUnique({
    where: { code },
    include: {
      resident: { select: { fullName: true } },
      residential: { select: { name: true, id: true } },
    },
  });

  if (!qr) {
    return { valid: false, reason: "QR no encontrado.", visitorName: null, residentialName: null };
  }

  if (!scannerResidentialId || qr.residentialId !== scannerResidentialId) {
    return {
      valid: false,
      reason: "Este QR no pertenece a la residencial del guardia.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
      residentName: qr.resident.fullName,
    };
  }

  const now = new Date();
  if (qr.isRevoked) {
    return {
      valid: false,
      reason: "Este QR fue revocado.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
      residentName: qr.resident.fullName,
    };
  }

  if (now < qr.validFrom || now > qr.validUntil) {
    return {
      valid: false,
      reason: "QR vencido o fuera de su ventana de validez.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
      residentName: qr.resident.fullName,
    };
  }

  if (qr.usedCount >= qr.maxUses) {
    return {
      valid: false,
      reason: qr.maxUses === 1 ? "Este QR ya fue utilizado." : "Este QR ya agotó sus usos permitidos.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
      residentName: qr.resident.fullName,
    };
  }

  if (consume) {
    await prisma.$transaction([
      prisma.qrCode.update({
        where: { id: qr.id },
        data: { usedCount: { increment: 1 } },
      }),
      prisma.qrScan.create({
        data: {
          codeId: qr.id,
          scannerId,
          isValid: true,
          reason: "Ingreso autorizado.",
          idPhotoData: scanEvidence
            ? (scanEvidence.idPhotoData as unknown as Uint8Array<ArrayBuffer>)
            : null,
          idPhotoMimeType: scanEvidence?.idPhotoMimeType,
          idPhotoSize: scanEvidence?.idPhotoSize,
          idCapturedAt: scanEvidence ? new Date() : null,
        },
      }),
    ]);
  }

  return {
    valid: true,
    reason: consume ? "Ingreso autorizado." : "QR valido. Falta capturar foto del ID.",
    visitorName: qr.visitorName,
    residentialName: qr.residential.name,
    residentName: qr.resident.fullName,
    residentId: qr.residentId,
  };
}
