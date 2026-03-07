"use server";

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { calculateValidityWindow } from "@/lib/qr";
import { notifyUser } from "@/lib/push";

const createUserSchema = z.object({
  fullName: z.string().min(3, "Nombre invalido."),
  email: z.string().email("Correo invalido."),
  password: z.string().min(6, "El password debe tener minimo 6 caracteres."),
  role: z.enum(["RESIDENT", "GUARD"]),
  houseNumber: z.string().max(30, "Numero de vivienda demasiado largo.").optional(),
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().min(3, "Nombre invalido."),
  email: z.string().email("Correo invalido."),
  password: z.string().optional(),
  houseNumber: z.string().max(30, "Numero de vivienda demasiado largo.").optional(),
});

const createZoneSchema = z.object({
  name: z.string().min(2, "Nombre de zona invalido."),
  description: z.string().max(180, "Descripcion demasiado larga.").optional(),
  maxHoursPerReservation: z.coerce.number().int().min(1, "El maximo debe ser al menos 1 hora."),
});

const blockZoneSchema = z.object({
  zoneId: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  reason: z.string().max(180).optional(),
});

const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Titulo invalido."),
  message: z.string().min(5, "Mensaje invalido.").max(500, "Mensaje demasiado largo."),
  targetMode: z.enum(["ALL_RESIDENTS", "SELECTED_RESIDENTS"]),
});

const createAdminQrSchema = z.object({
  visitorName: z.string().min(2, "Nombre de visita invalido."),
  validityType: z.enum(["SINGLE_USE", "ONE_DAY", "THREE_DAYS", "INFINITE"]),
  description: z.string().max(180).optional(),
  hasVehicle: z.enum(["yes", "no"]).default("no"),
  qrMode: z.enum(["GENERAL", "RESIDENT"]),
  residentId: z.string().optional(),
});

function overlapRange(startsAt: Date, endsAt: Date, otherStart: Date, otherEnd: Date) {
  return startsAt < otherEnd && endsAt > otherStart;
}

export async function createResidentialUserAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    houseNumber: formData.get("houseNumber") || undefined,
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Datos invalidos.";
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "Ya existe un usuario con ese correo.";

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await prisma.user.create({
    data: {
      fullName: parsed.data.fullName.trim(),
      email,
      passwordHash,
      role: parsed.data.role,
      houseNumber: parsed.data.houseNumber?.trim() || null,
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/residential-admin");
  return "Usuario creado correctamente.";
}

export async function updateResidentialUserAction(formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return;

  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
    houseNumber: formData.get("houseNumber") || undefined,
  });
  if (!parsed.success) return;

  const targetUser = await prisma.user.findFirst({
    where: {
      id: parsed.data.userId,
      residentialId: session.residentialId,
      role: { in: ["RESIDENT", "GUARD"] },
    },
    select: { id: true },
  });
  if (!targetUser) return;

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: parsed.data.userId },
    },
    select: { id: true },
  });
  if (existing) return;

  const updateData: {
    fullName: string;
    email: string;
    houseNumber: string | null;
    passwordHash?: string;
  } = {
    fullName: parsed.data.fullName.trim(),
    email,
    houseNumber: parsed.data.houseNumber?.trim() || null,
  };

  if (parsed.data.password && parsed.data.password.trim().length >= 6) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password.trim(), 10);
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: updateData,
  });

  revalidatePath("/residential-admin");
}

export async function deleteResidentialUserAction(formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return;

  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  await prisma.user.deleteMany({
    where: {
      id: userId,
      residentialId: session.residentialId,
      role: { in: ["RESIDENT", "GUARD"] },
    },
  });

  revalidatePath("/residential-admin");
}

export async function createZoneAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createZoneSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    maxHoursPerReservation: formData.get("maxHoursPerReservation"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  const existing = await prisma.zone.findFirst({
    where: {
      residentialId: session.residentialId,
      name: parsed.data.name.trim(),
    },
    select: { id: true },
  });
  if (existing) return "Ya existe una zona con ese nombre.";

  await prisma.zone.create({
    data: {
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      maxHoursPerReservation: parsed.data.maxHoursPerReservation,
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/residential-admin");
  revalidatePath("/resident");
  return "Zona creada correctamente.";
}

export async function createZoneBlockAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = blockZoneSchema.safeParse({
    zoneId: formData.get("zoneId"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(parsed.data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return "Fecha/hora invalida.";
  if (startsAt >= endsAt) return "La hora final debe ser mayor que la hora inicial.";

  const zone = await prisma.zone.findFirst({
    where: {
      id: parsed.data.zoneId,
      residentialId: session.residentialId,
      isActive: true,
    },
    select: { id: true },
  });
  if (!zone) return "Zona no encontrada.";

  const [existingBlocks, existingReservations] = await Promise.all([
    prisma.zoneBlock.findMany({
      where: { zoneId: zone.id },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.zoneReservation.findMany({
      where: { zoneId: zone.id, status: "APPROVED" },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  if (existingBlocks.some((item) => overlapRange(startsAt, endsAt, item.startsAt, item.endsAt))) {
    return "Ese rango ya esta bloqueado.";
  }
  if (existingReservations.some((item) => overlapRange(startsAt, endsAt, item.startsAt, item.endsAt))) {
    return "Ese rango tiene reservas existentes.";
  }

  await prisma.zoneBlock.create({
    data: {
      zoneId: zone.id,
      createdById: session.userId,
      residentialId: session.residentialId,
      startsAt,
      endsAt,
      reason: parsed.data.reason?.trim() || null,
    },
  });

  revalidatePath("/residential-admin");
  revalidatePath("/resident");
  return "Bloqueo creado correctamente.";
}

export async function cancelZoneReservationByAdminAction(formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return;

  const reservationId = String(formData.get("reservationId") ?? "");
  if (!reservationId) return;

  const target = await prisma.zoneReservation.findFirst({
    where: {
      id: reservationId,
      residentialId: session.residentialId,
      status: "APPROVED",
    },
    include: {
      zone: { select: { name: true } },
      resident: { select: { id: true, fullName: true } },
    },
  });
  if (!target) return;

  await prisma.zoneReservation.update({
    where: { id: target.id },
    data: { status: "CANCELLED" },
  });

  await notifyUser(target.resident.id, {
    title: "Reserva cancelada",
    body: `Tu reserva de ${target.zone.name} fue cancelada por administracion.`,
    url: "/resident",
  });

  revalidatePath("/residential-admin");
  revalidatePath("/resident");
}

export async function sendResidentialAnnouncementAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createAnnouncementSchema.safeParse({
    title: formData.get("title"),
    message: formData.get("message"),
    targetMode: formData.get("targetMode"),
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  let targetResidents = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: "RESIDENT",
    },
    select: { id: true, fullName: true },
  });

  if (parsed.data.targetMode === "SELECTED_RESIDENTS") {
    const selectedResidentIds = formData
      .getAll("residentIds")
      .map((value) => String(value))
      .filter(Boolean);
    if (selectedResidentIds.length === 0) return "Debes seleccionar al menos un residente.";
    targetResidents = targetResidents.filter((resident) => selectedResidentIds.includes(resident.id));
  }

  if (targetResidents.length === 0) return "No hay residentes para notificar.";

  const announcement = await prisma.adminAnnouncement.create({
    data: {
      title: parsed.data.title.trim(),
      message: parsed.data.message.trim(),
      targetMode: parsed.data.targetMode,
      residentialId: session.residentialId,
      createdById: session.userId,
    },
  });

  await prisma.adminAnnouncementRecipient.createMany({
    data: targetResidents.map((resident) => ({
      userId: resident.id,
      announcementId: announcement.id,
    })),
    skipDuplicates: true,
  });

  await Promise.all(
    targetResidents.map((resident) =>
      notifyUser(resident.id, {
        title: `Comunicado: ${parsed.data.title.trim()}`,
        body: parsed.data.message.trim(),
        url: "/resident",
      }),
    ),
  );

  revalidatePath("/residential-admin");
  return `Comunicado enviado a ${targetResidents.length} residente(s).`;
}

export async function createAdminQrAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createAdminQrSchema.safeParse({
    visitorName: formData.get("visitorName"),
    validityType: formData.get("validityType"),
    description: formData.get("description") || undefined,
    hasVehicle: formData.get("hasVehicle") || "no",
    qrMode: formData.get("qrMode"),
    residentId: formData.get("residentId") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  let targetResidentId = session.userId;
  if (parsed.data.qrMode === "RESIDENT") {
    if (!parsed.data.residentId) return "Debes seleccionar un residente objetivo.";
    const resident = await prisma.user.findFirst({
      where: {
        id: parsed.data.residentId,
        residentialId: session.residentialId,
        role: "RESIDENT",
      },
      select: { id: true },
    });
    if (!resident) return "Residente no valido.";
    targetResidentId = resident.id;
  }

  const generatedCode = randomUUID().replaceAll("-", "");
  const validityWindow = calculateValidityWindow(parsed.data.validityType);
  await prisma.qrCode.create({
    data: {
      code: generatedCode,
      visitorName: parsed.data.visitorName.trim(),
      description: parsed.data.description?.trim() || null,
      hasVehicle: parsed.data.hasVehicle === "yes",
      validityType: parsed.data.validityType,
      validFrom: validityWindow.validFrom,
      validUntil: validityWindow.validUntil,
      maxUses: validityWindow.maxUses,
      residentId: targetResidentId,
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/residential-admin");
  revalidatePath("/guard");
  return "QR generado correctamente por administracion.";
}
