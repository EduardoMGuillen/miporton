"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/push";

const announceDeliverySchema = z.object({
  residentId: z.string().min(1, "Debes seleccionar un residente."),
  deliveryNote: z.string().min(3, "Escribe un detalle corto del delivery.").max(180, "Detalle demasiado largo."),
});

export async function confirmManualExitAction(formData: FormData) {
  const session = await requireRole(["GUARD"]);
  if (!session.residentialId) return;

  const scanId = String(formData.get("scanId") ?? "");
  if (!scanId) return;

  const targetScan = await prisma.qrScan.findFirst({
    where: {
      id: scanId,
      isValid: true,
      exitedAt: null,
      reason: { contains: "manual", mode: "insensitive" },
      code: { residentialId: session.residentialId },
    },
    select: { id: true },
  });
  if (!targetScan) return;

  await prisma.qrScan.update({
    where: { id: targetScan.id },
    data: {
      exitedAt: new Date(),
      exitNote: "Salida registrada manualmente por guardia.",
    },
  });

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
