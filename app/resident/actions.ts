"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { calculateValidityWindow } from "@/lib/qr";

const createInviteSchema = z.object({
  visitorName: z.string().min(2, "Nombre de visita invalido."),
  validityType: z.enum(["SINGLE_USE", "ONE_DAY", "THREE_DAYS"]),
});

export async function createInviteQrAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createInviteSchema.safeParse({
    visitorName: formData.get("visitorName"),
    validityType: formData.get("validityType"),
  });

  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  const generatedCode = randomUUID().replaceAll("-", "");
  const validityWindow = calculateValidityWindow(parsed.data.validityType);

  await prisma.qrCode.create({
    data: {
      code: generatedCode,
      visitorName: parsed.data.visitorName.trim(),
      validityType: parsed.data.validityType,
      validFrom: validityWindow.validFrom,
      validUntil: validityWindow.validUntil,
      maxUses: validityWindow.maxUses,
      residentId: session.userId,
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/resident");
  return "QR generado correctamente.";
}

export async function deleteInviteQrAction(formData: FormData) {
  const session = await requireRole(["RESIDENT"]);
  const qrId = String(formData.get("qrId") ?? "");
  if (!qrId) return;

  await prisma.qrCode.deleteMany({
    where: {
      id: qrId,
      residentId: session.userId,
    },
  });

  revalidatePath("/resident");
}
