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

const createSuggestionSchema = z.object({
  message: z
    .string()
    .trim()
    .min(6, "Escribe una sugerencia un poco mas detallada.")
    .max(500, "La sugerencia es demasiado larga."),
});

function overlapRange(
  startsAt: Date,
  endsAt: Date,
  otherStart: Date,
  otherEnd: Date,
) {
  return startsAt < otherEnd && endsAt > otherStart;
}

function parseTegucigalpaDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }
  // America/Tegucigalpa is UTC-6 (no DST). Convert local wall time to UTC.
  return new Date(Date.UTC(year, month - 1, day, hour + 6, minute, 0, 0));
}

function parseLocalDateTimeParts(value: string) {
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, datePart, hourRaw, minuteRaw] = match;
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return { datePart, hour, minute };
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

  const residential = await prisma.residential.findUnique({
    where: { id: session.residentialId },
    select: {
      allowResidentQrSingleUse: true,
      allowResidentQrOneDay: true,
      allowResidentQrThreeDays: true,
      allowResidentQrInfinite: true,
    },
  });
  if (!residential) return "No se encontro la residencial asociada.";

  const validityAllowed =
    (parsed.data.validityType === "SINGLE_USE" && residential.allowResidentQrSingleUse) ||
    (parsed.data.validityType === "ONE_DAY" && residential.allowResidentQrOneDay) ||
    (parsed.data.validityType === "THREE_DAYS" && residential.allowResidentQrThreeDays) ||
    (parsed.data.validityType === "INFINITE" && residential.allowResidentQrInfinite);
  if (!validityAllowed) {
    return "La administracion de tu residencial desactivo ese tipo de vigencia QR.";
  }

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

  const startsAt = parseTegucigalpaDateTime(parsed.data.startsAt);
  const endsAt = parseTegucigalpaDateTime(parsed.data.endsAt);
  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
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
    select: {
      id: true,
      name: true,
      maxHoursPerReservation: true,
      oneReservationPerDay: true,
      scheduleStartHour: true,
      scheduleEndHour: true,
    },
  });
  if (!zone) return "Zona no disponible.";

  const hours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
  if (hours > zone.maxHoursPerReservation) {
    return `El maximo permitido para esta zona es ${zone.maxHoursPerReservation} hora(s).`;
  }

  const localStart = parseLocalDateTimeParts(parsed.data.startsAt);
  const localEnd = parseLocalDateTimeParts(parsed.data.endsAt);
  if (!localStart || !localEnd) return "Fecha/hora invalida.";
  if (localStart.datePart !== localEnd.datePart) {
    return "La reserva debe iniciar y finalizar en la misma fecha.";
  }
  if (localStart.minute !== 0 || localEnd.minute !== 0) {
    return "La reserva debe ser en bloques de hora completa.";
  }
  if (localStart.hour < zone.scheduleStartHour || localEnd.hour > zone.scheduleEndHour) {
    return `Horario no permitido. Esta zona opera de ${String(zone.scheduleStartHour).padStart(2, "0")}:00 a ${String(zone.scheduleEndHour).padStart(2, "0")}:00.`;
  }

  if (zone.oneReservationPerDay) {
    const [yearRaw, monthRaw, dayRaw] = localStart.datePart.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    const dayStartUtc = new Date(Date.UTC(year, month - 1, day, 6, 0, 0, 0));
    const dayEndUtc = new Date(Date.UTC(year, month - 1, day + 1, 6, 0, 0, 0));
    const reservationInDay = await prisma.zoneReservation.findFirst({
      where: {
        zoneId: zone.id,
        status: "APPROVED",
        startsAt: {
          gte: dayStartUtc,
          lt: dayEndUtc,
        },
      },
      select: { id: true },
    });
    if (reservationInDay) {
      return "Esta zona permite solo 1 reserva por dia y ya existe una reserva para esa fecha.";
    }
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
      timeZone: "America/Tegucigalpa",
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

export async function createResidentSuggestionAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createSuggestionSchema.safeParse({
    message: formData.get("message"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  await prisma.residentSuggestion.create({
    data: {
      message: parsed.data.message,
      residentId: session.userId,
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/resident");
  revalidatePath("/residential-admin/sugerencias");
  return "Sugerencia enviada correctamente.";
}
