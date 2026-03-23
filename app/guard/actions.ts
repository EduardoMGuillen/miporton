"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/push";
import { idPhotoFileToBytes, validateIdPhotoFile } from "@/lib/id-photo-storage";

const announceDeliverySchema = z.object({
  residentId: z.string().min(1, "Debes seleccionar un residente."),
  deliveryNote: z.string().min(3, "Escribe un detalle corto del delivery.").max(180, "Detalle demasiado largo."),
});

export async function acceptAnnouncedVisitAction(formData: FormData) {
  const session = await requireRole(["GUARD"]);
  if (!session.residentialId) return;

  const qrId = String(formData.get("qrId") ?? "");
  if (!qrId) return;

  const idPhoto = formData.get("idPhoto");
  const platePhoto = formData.get("platePhoto");
  if (!(idPhoto instanceof File)) return;

  let idPhotoData: Uint8Array;
  try {
    validateIdPhotoFile(idPhoto);
    idPhotoData = await idPhotoFileToBytes(idPhoto);
  } catch {
    return;
  }

  const qr = await prisma.qrCode.findFirst({
    where: {
      id: qrId,
      residentialId: session.residentialId,
      isRevoked: false,
      validUntil: { gte: new Date() },
    },
    include: {
      scans: {
        where: { isValid: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!qr) return;
  if (qr.scans.length > 0) {
    revalidatePath("/guard");
    return;
  }
  if (qr.usedCount >= qr.maxUses) {
    revalidatePath("/guard");
    return;
  }

  let platePhotoData: Uint8Array | null = null;
  let platePhotoMimeType: string | null = null;
  let platePhotoSize: number | null = null;
  if (qr.hasVehicle) {
    if (!(platePhoto instanceof File)) return;
    try {
      validateIdPhotoFile(platePhoto);
      platePhotoData = await idPhotoFileToBytes(platePhoto);
      platePhotoMimeType = platePhoto.type;
      platePhotoSize = platePhoto.size;
    } catch {
      return;
    }
  }

  await prisma.$transaction([
    prisma.qrCode.update({
      where: { id: qr.id },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.qrScan.create({
      data: {
        codeId: qr.id,
        scannerId: session.userId,
        isValid: true,
        reason: "Llegada confirmada manualmente por guardia.",
        idPhotoData: idPhotoData as unknown as Uint8Array<ArrayBuffer>,
        idPhotoMimeType: idPhoto.type,
        idPhotoSize: idPhoto.size,
        idCapturedAt: new Date(),
        platePhotoData: platePhotoData ? (platePhotoData as unknown as Uint8Array<ArrayBuffer>) : null,
        platePhotoMimeType,
        platePhotoSize,
      },
    }),
  ]);

  revalidatePath("/guard");
}

export async function announceDeliveryAtGateAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["GUARD"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = announceDeliverySchema.safeParse({
    residentId: formData.get("residentId"),
    deliveryNote: formData.get("deliveryNote"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Datos invalidos.";
  }

  const resident = await prisma.user.findFirst({
    where: {
      id: parsed.data.residentId,
      residentialId: session.residentialId,
      role: "RESIDENT",
    },
    select: { id: true, fullName: true },
  });
  if (!resident) return "No se encontro el residente seleccionado.";

  const trimmedNote = parsed.data.deliveryNote.trim();
  await prisma.deliveryAnnouncement.create({
    data: {
      note: trimmedNote,
      residentId: resident.id,
      guardId: session.userId,
      residentialId: session.residentialId,
    },
  });

  await notifyUser(resident.id, {
    title: "MiVisita",
    body: `Guardia: hay un delivery para ti. Detalle: ${trimmedNote}`,
    url: "/resident",
  });

  revalidatePath("/residential-admin");
  revalidatePath("/super-admin");
  return `Notificacion enviada a ${resident.fullName}.`;
}
