"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { calculateValidityWindow } from "@/lib/qr";
import { notifyGuardsInResidential, notifyResidentialAdminsInResidential } from "@/lib/push";

const createInviteSchema = z.object({
  visitorName: z.string().min(2, "Nombre de visita invalido."),
  validityType: z.enum(["SINGLE_USE", "ONE_DAY", "THREE_DAYS", "INFINITE"]),
  description: z.string().max(180, "Descripcion demasiado larga.").optional(),
  hasVehicle: z.enum(["yes", "no"]).default("no"),
});

const createZoneReservationSchema = z.object({
  zoneId: z.string().min(1, "Debes seleccionar una zona."),
  startsAt: z.string().min(1, "Debes seleccionar fecha/hora de inicio."),
  endsAt: z.string().min(1, "Debes seleccionar fecha/hora de fin."),
  note: z.string().max(180, "Nota demasiado larga.").optional(),
});

function overlapRange(
  startsAt: Date,
  endsAt: Date,
  otherStart: Date,
  otherEnd: Date,
) {
  return startsAt < otherEnd && endsAt > otherStart;
}

export async function createInviteQrAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createInviteSchema.safeParse({
    visitorName: formData.get("visitorName"),
    validityType: formData.get("validityType"),
    description: formData.get("description") || undefined,
    hasVehicle: formData.get("hasVehicle") || "no",
  });

  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  const generatedCode = randomUUID().replaceAll("-", "");
  const validityWindow = calculateValidityWindow(parsed.data.validityType);

  await prisma.qrCode.create({
    data: {
      code: generatedCode,
      visitorName: parsed.data.visitorName.trim(),
      validityType: parsed.data.validityType,
      description: parsed.data.description?.trim() || null,
      hasVehicle: parsed.data.hasVehicle === "yes",
      validFrom: validityWindow.validFrom,
      validUntil: validityWindow.validUntil,
      maxUses: validityWindow.maxUses,
      residentId: session.userId,
      residentialId: session.residentialId,
    },
  });

  await notifyGuardsInResidential(session.residentialId, {
    title: "Nueva visita anunciada",
    body: `${parsed.data.visitorName.trim()} fue anunciado por ${session.fullName}.`,
    url: "/guard",
  });

  revalidatePath("/resident");
  return "QR generado correctamente.";
}

export async function createZoneReservationAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createZoneReservationSchema.safeParse({
    zoneId: formData.get("zoneId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return "Fecha/hora invalida.";
  }
  if (startsAt >= endsAt) return "La hora final debe ser mayor que la hora inicial.";
  if (startsAt < new Date()) return "No puedes reservar en el pasado.";

  const zone = await prisma.zone.findFirst({
    where: {
      id: parsed.data.zoneId,
      residentialId: session.residentialId,
      isActive: true,
    },
    select: { id: true, name: true, maxHoursPerReservation: true },
  });
  if (!zone) return "Zona no disponible.";

  const hours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
  if (hours > zone.maxHoursPerReservation) {
    return `El maximo permitido para esta zona es ${zone.maxHoursPerReservation} hora(s).`;
  }

  const [existingReservations, existingBlocks] = await Promise.all([
    prisma.zoneReservation.findMany({
      where: {
        zoneId: zone.id,
        status: "APPROVED",
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.zoneBlock.findMany({
      where: { zoneId: zone.id },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  const reservationConflict = existingReservations.some((item) =>
    overlapRange(startsAt, endsAt, item.startsAt, item.endsAt),
  );
  if (reservationConflict) return "Ese horario ya esta reservado.";

  const blockConflict = existingBlocks.some((item) =>
    overlapRange(startsAt, endsAt, item.startsAt, item.endsAt),
  );
  if (blockConflict) return "Ese horario esta bloqueado por administracion.";

  await prisma.zoneReservation.create({
    data: {
      zoneId: zone.id,
      residentId: session.userId,
      residentialId: session.residentialId,
      startsAt,
      endsAt,
      note: parsed.data.note?.trim() || null,
      status: "APPROVED",
    },
  });
  await notifyResidentialAdminsInResidential(session.residentialId, {
    title: "Nueva reserva de zona",
    body: `${session.fullName} reservo ${zone.name} para ${startsAt.toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}.`,
    url: "/residential-admin",
  });

  revalidatePath("/resident");
  revalidatePath("/residential-admin");
  return "Reserva creada correctamente.";
}

export async function cancelZoneReservationAction(formData: FormData) {
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return;

  const reservationId = String(formData.get("reservationId") ?? "");
  if (!reservationId) return;

  await prisma.zoneReservation.updateMany({
    where: {
      id: reservationId,
      residentId: session.userId,
      residentialId: session.residentialId,
      status: "APPROVED",
    },
    data: { status: "CANCELLED" },
  });

  revalidatePath("/resident");
  revalidatePath("/residential-admin");
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
