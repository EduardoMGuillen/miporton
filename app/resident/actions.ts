"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { calculateValidityWindow } from "@/lib/qr";
import { notifyGuardsInResidential, notifyResidentialAdminsInResidential } from "@/lib/push";
import {
  zoneReservationError,
  zoneReservationSuccess,
  type ZoneReservationActionState,
} from "@/lib/zone-reservation-form-state";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { RESIDENT_LOCALE_COOKIE, type ResidentLocale } from "@/lib/resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";

function translateZodIssue(locale: ResidentLocale, message: string | undefined, fallbackKey?: string) {
  if (message && message.startsWith("errors.")) return residentT(locale, message);
  return residentT(locale, fallbackKey ?? "errors.invite.invalidData");
}

function translateZoneZodIssue(locale: ResidentLocale, message: string | undefined) {
  if (message && message.startsWith("errors.")) return residentT(locale, message);
  return residentT(locale, "errors.zone.invalidData");
}

const createInviteSchema = z.object({
  visitorName: z.string().min(2, "errors.invite.visitorName"),
  validityType: z.enum(["SINGLE_USE", "ONE_DAY", "THREE_DAYS", "INFINITE"]),
  description: z.string().max(180, "errors.invite.description").optional(),
  hasVehicle: z.enum(["yes", "no"]).default("no"),
});

const createZoneReservationSchema = z.object({
  zoneId: z.string().min(1, "errors.zone.selectZoneRequired"),
  startsAt: z.string().min(1, "errors.zone.startRequired"),
  endsAt: z.string().min(1, "errors.zone.endRequired"),
  note: z.string().max(180, "errors.zone.noteLong").optional(),
});

const updateZoneReservationSchema = z.object({
  reservationId: z.string().min(1, "errors.zone.reservationInvalid"),
  startsAt: z.string().min(1, "errors.zone.startRequired"),
  endsAt: z.string().min(1, "errors.zone.endRequired"),
  note: z.string().max(180, "errors.zone.noteLong").optional(),
});

const createSuggestionSchema = z.object({
  message: z
    .string()
    .trim()
    .min(6, "errors.suggestion.message")
    .max(500, "errors.suggestion.messageLong"),
});

const updateContactSchema = z.object({
  personalEmail: z
    .string()
    .trim()
    .max(120, "errors.contact.emailLong")
    .optional()
    .transform((value) => value ?? ""),
  phoneNumber: z
    .string()
    .trim()
    .max(30, "errors.contact.phoneLong")
    .optional()
    .transform((value) => value ?? ""),
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
  const locale = await getResidentLocale();
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return residentT(locale, "errors.invite.session");

  const parsed = createInviteSchema.safeParse({
    visitorName: formData.get("visitorName"),
    validityType: formData.get("validityType"),
    description: formData.get("description") || undefined,
    hasVehicle: formData.get("hasVehicle") || "no",
  });

  if (!parsed.success) return translateZodIssue(locale, parsed.error.issues[0]?.message);

  const residential = await prisma.residential.findUnique({
    where: { id: session.residentialId },
    select: {
      allowResidentQrSingleUse: true,
      allowResidentQrOneDay: true,
      allowResidentQrThreeDays: true,
      allowResidentQrInfinite: true,
    },
  });
  if (!residential) return residentT(locale, "errors.invite.residentialNotFound");

  const validityAllowed =
    (parsed.data.validityType === "SINGLE_USE" && residential.allowResidentQrSingleUse) ||
    (parsed.data.validityType === "ONE_DAY" && residential.allowResidentQrOneDay) ||
    (parsed.data.validityType === "THREE_DAYS" && residential.allowResidentQrThreeDays) ||
    (parsed.data.validityType === "INFINITE" && residential.allowResidentQrInfinite);
  if (!validityAllowed) {
    return residentT(locale, "errors.invite.validityDisabled");
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
  return residentT(locale, "success.invite");
}

export async function createZoneReservationAction(
  _prevState: ZoneReservationActionState | null,
  formData: FormData,
): Promise<ZoneReservationActionState> {
  const locale = await getResidentLocale();
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return zoneReservationError(residentT(locale, "errors.zone.session"));

  const parsed = createZoneReservationSchema.safeParse({
    zoneId: formData.get("zoneId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return zoneReservationError(translateZoneZodIssue(locale, parsed.error.issues[0]?.message));
  }

  const startsAt = parseTegucigalpaDateTime(parsed.data.startsAt);
  const endsAt = parseTegucigalpaDateTime(parsed.data.endsAt);
  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return zoneReservationError(residentT(locale, "errors.zone.invalidDateTime"));
  }
  if (startsAt >= endsAt) return zoneReservationError(residentT(locale, "errors.zone.endBeforeStart"));
  if (startsAt < new Date()) return zoneReservationError(residentT(locale, "errors.zone.past"));

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
  if (!zone) return zoneReservationError(residentT(locale, "errors.zone.unavailable"));

  const hours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
  if (hours > zone.maxHoursPerReservation) {
    return zoneReservationError(
      residentT(locale, "errors.zone.maxHours", { n: zone.maxHoursPerReservation }),
    );
  }

  const localStart = parseLocalDateTimeParts(parsed.data.startsAt);
  const localEnd = parseLocalDateTimeParts(parsed.data.endsAt);
  if (!localStart || !localEnd) return zoneReservationError(residentT(locale, "errors.zone.invalidDateTime"));
  if (localStart.datePart !== localEnd.datePart) {
    return zoneReservationError(residentT(locale, "errors.zone.sameDay"));
  }
  if (localStart.minute !== 0 || localEnd.minute !== 0) {
    return zoneReservationError(residentT(locale, "errors.zone.hourBlocks"));
  }
  if (localStart.hour < zone.scheduleStartHour || localEnd.hour > zone.scheduleEndHour) {
    return zoneReservationError(
      residentT(locale, "errors.zone.schedule", {
        start: String(zone.scheduleStartHour).padStart(2, "0"),
        end: String(zone.scheduleEndHour).padStart(2, "0"),
      }),
    );
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
      return zoneReservationError(residentT(locale, "errors.zone.onePerDay"), { conflict: "onePerDay" });
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
  if (reservationConflict) {
    return zoneReservationError(residentT(locale, "errors.zone.occupied"), { conflict: "occupied" });
  }

  const blockConflict = existingBlocks.some((item) =>
    overlapRange(startsAt, endsAt, item.startsAt, item.endsAt),
  );
  if (blockConflict) return zoneReservationError(residentT(locale, "errors.zone.blocked"));

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

  const residentialRow = await prisma.residential.findUnique({
    where: { id: session.residentialId },
    select: { name: true },
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
  return zoneReservationSuccess({
    residentialName: residentialRow?.name ?? undefined,
    zoneName: zone.name,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    note: parsed.data.note?.trim() || null,
  });
}

export async function updateZoneReservationAction(
  _prevState: ZoneReservationActionState | null,
  formData: FormData,
): Promise<ZoneReservationActionState> {
  const locale = await getResidentLocale();
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return zoneReservationError(residentT(locale, "errors.zone.session"));

  const parsed = updateZoneReservationSchema.safeParse({
    reservationId: formData.get("reservationId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return zoneReservationError(translateZoneZodIssue(locale, parsed.error.issues[0]?.message));
  }

  const startsAt = parseTegucigalpaDateTime(parsed.data.startsAt);
  const endsAt = parseTegucigalpaDateTime(parsed.data.endsAt);
  if (!startsAt || !endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return zoneReservationError(residentT(locale, "errors.zone.invalidDateTime"));
  }
  if (startsAt >= endsAt) return zoneReservationError(residentT(locale, "errors.zone.endBeforeStart"));
  if (startsAt < new Date()) return zoneReservationError(residentT(locale, "errors.zone.pastMove"));

  const existing = await prisma.zoneReservation.findFirst({
    where: {
      id: parsed.data.reservationId,
      residentId: session.userId,
      residentialId: session.residentialId,
      status: "APPROVED",
    },
    select: {
      id: true,
      zoneId: true,
      zone: {
        select: {
          id: true,
          name: true,
          maxHoursPerReservation: true,
          oneReservationPerDay: true,
          scheduleStartHour: true,
          scheduleEndHour: true,
        },
      },
    },
  });
  if (!existing) return zoneReservationError(residentT(locale, "errors.zone.notFound"));

  const zone = existing.zone;
  const hours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
  if (hours > zone.maxHoursPerReservation) {
    return zoneReservationError(
      residentT(locale, "errors.zone.maxHours", { n: zone.maxHoursPerReservation }),
    );
  }

  const localStart = parseLocalDateTimeParts(parsed.data.startsAt);
  const localEnd = parseLocalDateTimeParts(parsed.data.endsAt);
  if (!localStart || !localEnd) return zoneReservationError(residentT(locale, "errors.zone.invalidDateTime"));
  if (localStart.datePart !== localEnd.datePart) {
    return zoneReservationError(residentT(locale, "errors.zone.sameDay"));
  }
  if (localStart.minute !== 0 || localEnd.minute !== 0) {
    return zoneReservationError(residentT(locale, "errors.zone.hourBlocks"));
  }
  if (localStart.hour < zone.scheduleStartHour || localEnd.hour > zone.scheduleEndHour) {
    return zoneReservationError(
      residentT(locale, "errors.zone.schedule", {
        start: String(zone.scheduleStartHour).padStart(2, "0"),
        end: String(zone.scheduleEndHour).padStart(2, "0"),
      }),
    );
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
        id: { not: existing.id },
        startsAt: {
          gte: dayStartUtc,
          lt: dayEndUtc,
        },
      },
      select: { id: true },
    });
    if (reservationInDay) {
      return zoneReservationError(residentT(locale, "errors.zone.onePerDay"), { conflict: "onePerDay" });
    }
  }

  const [existingReservations, existingBlocks] = await Promise.all([
    prisma.zoneReservation.findMany({
      where: {
        zoneId: zone.id,
        status: "APPROVED",
        id: { not: existing.id },
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
  if (reservationConflict) {
    return zoneReservationError(residentT(locale, "errors.zone.occupied"), { conflict: "occupied" });
  }

  const blockConflict = existingBlocks.some((item) =>
    overlapRange(startsAt, endsAt, item.startsAt, item.endsAt),
  );
  if (blockConflict) return zoneReservationError(residentT(locale, "errors.zone.blocked"));

  const updated = await prisma.zoneReservation.updateMany({
    where: {
      id: existing.id,
      residentId: session.userId,
      residentialId: session.residentialId,
      status: "APPROVED",
    },
    data: {
      startsAt,
      endsAt,
      note: parsed.data.note?.trim() || null,
    },
  });
  if (updated.count === 0) return zoneReservationError(residentT(locale, "errors.zone.updateFailed"));

  const residentialRow = await prisma.residential.findUnique({
    where: { id: session.residentialId },
    select: { name: true },
  });

  await notifyResidentialAdminsInResidential(session.residentialId, {
    title: "Reserva de zona modificada",
    body: `${session.fullName} cambio el horario de ${zone.name} a ${startsAt.toLocaleTimeString("es-HN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/Tegucigalpa",
    })}.`,
    url: "/residential-admin",
  });

  revalidatePath("/resident");
  revalidatePath("/residential-admin");
  revalidatePath("/guard");
  return zoneReservationSuccess({
    residentialName: residentialRow?.name ?? undefined,
    zoneName: zone.name,
    startsAtIso: startsAt.toISOString(),
    endsAtIso: endsAt.toISOString(),
    note: parsed.data.note?.trim() || null,
  });
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
  const locale = await getResidentLocale();
  const session = await requireRole(["RESIDENT"]);
  if (!session.residentialId) return residentT(locale, "errors.suggestion.session");

  const parsed = createSuggestionSchema.safeParse({
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return translateZodIssue(locale, parsed.error.issues[0]?.message, "errors.suggestion.invalidData");
  }

  await prisma.residentSuggestion.create({
    data: {
      message: parsed.data.message,
      residentId: session.userId,
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/resident");
  revalidatePath("/residential-admin/sugerencias");
  return residentT(locale, "success.suggestion");
}

export async function updateResidentContactAction(_prevState: string | null, formData: FormData) {
  const locale = await getResidentLocale();
  const session = await requireRole(["RESIDENT"]);

  const parsed = updateContactSchema.safeParse({
    personalEmail: formData.get("personalEmail") || "",
    phoneNumber: formData.get("phoneNumber") || "",
  });
  if (!parsed.success) {
    return translateZodIssue(locale, parsed.error.issues[0]?.message, "errors.contact.invalidData");
  }

  const personalEmailRaw = parsed.data.personalEmail;
  const phoneNumberRaw = parsed.data.phoneNumber;
  const personalEmail = personalEmailRaw ? personalEmailRaw.toLowerCase() : null;
  const phoneNumber = phoneNumberRaw || null;

  if (personalEmail) {
    const isEmailValid = z.string().email().safeParse(personalEmail).success;
    if (!isEmailValid) return residentT(locale, "errors.contact.emailInvalid");
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      personalEmail,
      phoneNumber,
    },
  });

  revalidatePath("/resident");
  return residentT(locale, "success.contact");
}

export async function setResidentLocaleAction(formData: FormData) {
  await requireRole(["RESIDENT"]);
  const choice = String(formData.get("locale") ?? "");
  const next: ResidentLocale = choice === "en" ? "en" : "es";
  const jar = await cookies();
  jar.set(RESIDENT_LOCALE_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
    sameSite: "lax",
  });
  revalidatePath("/resident", "layout");
}
