import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";

export function calculateValidityWindow(
  validityType: "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS" | "INFINITE",
) {
  const validFrom = new Date();
  if (validityType === "INFINITE") {
    return { validFrom, validUntil: new Date("2100-01-01T00:00:00.000Z"), maxUses: 2147483647 };
  }
  if (validityType === "SINGLE_USE") {
    return { validFrom, validUntil: addDays(validFrom, 3), maxUses: 1 };
  }
  if (validityType === "ONE_DAY") {
    return { validFrom, validUntil: addDays(validFrom, 1), maxUses: 9999 };
  }
  return { validFrom, validUntil: addDays(validFrom, 3), maxUses: 9999 };
}

function normalizeScannedCode(scannedCode: string) {
  return scannedCode.startsWith("MP:") ? scannedCode.slice(3) : scannedCode;
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
    platePhotoData?: Uint8Array;
    platePhotoMimeType?: string;
    platePhotoSize?: number;
  };
}) {
  const code = normalizeScannedCode(scannedCode);

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
    await prisma.$transaction(async (tx) => {
      const pendingEntry = await tx.qrScan.findFirst({
        where: {
          codeId: qr.id,
          isValid: true,
          exitedAt: null,
        },
        orderBy: { scannedAt: "desc" },
        select: { id: true },
      });

      if (pendingEntry) {
        await tx.qrScan.update({
          where: { id: pendingEntry.id },
          data: {
            exitedAt: new Date(),
            exitNote: "Salida automatica por reingreso; no se escaneo salida previa.",
          },
        });
      }

      await tx.qrCode.update({
        where: { id: qr.id },
        data: { usedCount: { increment: 1 } },
      });

      await tx.qrScan.create({
        data: {
          codeId: qr.id,
          scannerId,
          isValid: true,
          reason: pendingEntry
            ? "Ingreso autorizado. Se cerro salida pendiente automaticamente."
            : "Ingreso autorizado.",
          idPhotoData: scanEvidence
            ? (scanEvidence.idPhotoData as unknown as Uint8Array<ArrayBuffer>)
            : null,
          idPhotoMimeType: scanEvidence?.idPhotoMimeType,
          idPhotoSize: scanEvidence?.idPhotoSize,
          idCapturedAt: scanEvidence ? new Date() : null,
          platePhotoData: scanEvidence?.platePhotoData
            ? (scanEvidence.platePhotoData as unknown as Uint8Array<ArrayBuffer>)
            : null,
          platePhotoMimeType: scanEvidence?.platePhotoMimeType,
          platePhotoSize: scanEvidence?.platePhotoSize,
        },
      });
    });
  }

  return {
    valid: true,
    reason: consume ? "Ingreso autorizado." : "QR valido. Falta capturar foto del ID.",
    visitorName: qr.visitorName,
    visitorDescription: qr.description,
    hasVehicle: qr.hasVehicle,
    residentialName: qr.residential.name,
    residentName: qr.resident.fullName,
    residentId: qr.residentId,
  };
}

export async function registerQrExit({
  scannedCode,
  scannerResidentialId,
}: {
  scannedCode: string;
  scannerResidentialId: string | null;
}) {
  const code = normalizeScannedCode(scannedCode);
  const qr = await prisma.qrCode.findUnique({
    where: { code },
    include: {
      resident: { select: { fullName: true } },
      residential: { select: { name: true } },
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

  const pendingEntry = await prisma.qrScan.findFirst({
    where: {
      codeId: qr.id,
      isValid: true,
      exitedAt: null,
    },
    orderBy: { scannedAt: "desc" },
    select: { id: true },
  });

  if (!pendingEntry) {
    return {
      valid: false,
      reason: "No hay un ingreso pendiente para registrar salida.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
      residentName: qr.resident.fullName,
    };
  }

  await prisma.qrScan.update({
    where: { id: pendingEntry.id },
    data: {
      exitedAt: new Date(),
      exitNote: "Salida registrada por escaneo de salida.",
    },
  });

  return {
    valid: true,
    reason: "Salida registrada correctamente.",
    visitorName: qr.visitorName,
    residentialName: qr.residential.name,
    residentName: qr.resident.fullName,
    residentId: qr.residentId,
  };
}
