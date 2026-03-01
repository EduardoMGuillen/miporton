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
}: {
  scannedCode: string;
  scannerId: string;
  scannerResidentialId: string | null;
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
    };
  }

  const now = new Date();
  if (qr.isRevoked) {
    return {
      valid: false,
      reason: "Este QR fue revocado.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
    };
  }

  if (now < qr.validFrom || now > qr.validUntil) {
    return {
      valid: false,
      reason: "QR vencido o fuera de su ventana de validez.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
    };
  }

  if (qr.usedCount >= qr.maxUses) {
    return {
      valid: false,
      reason: "Este QR ya agotó sus usos permitidos.",
      visitorName: qr.visitorName,
      residentialName: qr.residential.name,
    };
  }

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
      },
    }),
  ]);

  return {
    valid: true,
    reason: "Ingreso autorizado.",
    visitorName: qr.visitorName,
    residentialName: qr.residential.name,
    residentName: qr.resident.fullName,
    residentId: qr.residentId,
  };
}
