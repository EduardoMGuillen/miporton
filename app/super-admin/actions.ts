"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const RESIDENTIAL_ADMIN_DELETE_SECURITY_PASSWORD = "Guillen01..";

const createResidentialSchema = z.object({
  residentialName: z.string().min(3, "Nombre de residencial invalido."),
  adminName: z.string().min(3, "Nombre del admin invalido."),
  adminEmail: z.string().email("Correo del admin invalido."),
  adminPassword: z.string().min(6, "El password debe tener minimo 6 caracteres."),
});

const updateResidentialAdminSchema = z.object({
  userId: z.string().min(1),
  fullName: z.string().min(3, "Nombre invalido."),
  email: z.string().email("Correo invalido."),
  password: z.string().optional(),
});

const createServiceContractSchema = z.object({
  residentialId: z.string().optional(),
  residentialName: z.string().min(3, "Nombre de residencial invalido."),
  legalRepresentative: z.string().min(3, "Representante legal invalido."),
  representativeEmail: z.string().email("Correo del representante invalido."),
  representativePhone: z.string().min(6, "Telefono invalido."),
  servicePlan: z.string().min(2, "Plan de servicio invalido."),
  monthlyAmount: z.coerce.number().positive("El monto mensual debe ser mayor a 0."),
  startsOn: z.string().min(1, "Debes indicar la fecha de inicio."),
  endsOn: z.string().optional(),
  terms: z.string().max(1500, "Terminos demasiado largos.").optional(),
});

const toggleResidentialSuspensionSchema = z.object({
  residentialId: z.string().min(1, "Residencial invalida."),
  nextStatus: z.enum(["suspend", "activate"]),
});

export async function createResidentialWithAdminAction(
  _prevState: string | null,
  formData: FormData,
) {
  await requireRole(["SUPER_ADMIN"]);

  const parsed = createResidentialSchema.safeParse({
    residentialName: formData.get("residentialName"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Datos invalidos.";
  }

  const adminEmail = parsed.data.adminEmail.toLowerCase();
  const userExists = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (userExists) return "Ya existe un usuario con ese correo.";

  const passwordHash = await bcrypt.hash(parsed.data.adminPassword, 10);

  await prisma.$transaction(async (tx) => {
    const residential = await tx.residential.create({
      data: { name: parsed.data.residentialName.trim() },
    });

    await tx.user.create({
      data: {
        fullName: parsed.data.adminName.trim(),
        email: adminEmail,
        passwordHash,
        role: "RESIDENTIAL_ADMIN",
        residentialId: residential.id,
      },
    });
  });

  revalidatePath("/super-admin");
  return "Residencial y admin creados correctamente.";
}

export async function updateResidentialAdminAction(formData: FormData) {
  await requireRole(["SUPER_ADMIN"]);

  const parsed = updateResidentialAdminSchema.safeParse({
    userId: formData.get("userId"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password") || undefined,
  });
  if (!parsed.success) return;

  const target = await prisma.user.findFirst({
    where: { id: parsed.data.userId, role: "RESIDENTIAL_ADMIN" },
    select: { id: true },
  });
  if (!target) return;

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { email, NOT: { id: parsed.data.userId } },
    select: { id: true },
  });
  if (existing) return;

  const updateData: {
    fullName: string;
    email: string;
    passwordHash?: string;
  } = {
    fullName: parsed.data.fullName.trim(),
    email,
  };

  if (parsed.data.password && parsed.data.password.trim().length >= 6) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password.trim(), 10);
  }

  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: updateData,
  });

  revalidatePath("/super-admin");
}

export async function deleteResidentialAdminAction(formData: FormData) {
  await requireRole(["SUPER_ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const deletePassword = String(formData.get("deletePassword") ?? "");
  if (!userId || deletePassword !== RESIDENTIAL_ADMIN_DELETE_SECURITY_PASSWORD) return;

  await prisma.user.deleteMany({
    where: { id: userId, role: "RESIDENTIAL_ADMIN" },
  });

  revalidatePath("/super-admin");
}

export async function createServiceContractAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["SUPER_ADMIN"]);

  const parsed = createServiceContractSchema.safeParse({
    residentialId: formData.get("residentialId") || undefined,
    residentialName: formData.get("residentialName"),
    legalRepresentative: formData.get("legalRepresentative"),
    representativeEmail: formData.get("representativeEmail"),
    representativePhone: formData.get("representativePhone"),
    servicePlan: formData.get("servicePlan"),
    monthlyAmount: formData.get("monthlyAmount"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn") || undefined,
    terms: formData.get("terms") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  const startsOn = new Date(parsed.data.startsOn);
  if (Number.isNaN(startsOn.getTime())) return "Fecha de inicio invalida.";
  const endsOn = parsed.data.endsOn ? new Date(parsed.data.endsOn) : null;
  if (endsOn && Number.isNaN(endsOn.getTime())) return "Fecha final invalida.";
  if (endsOn && endsOn <= startsOn) return "La fecha final debe ser mayor que la inicial.";

  await prisma.serviceContract.create({
    data: {
      residentialId: parsed.data.residentialId || null,
      residentialName: parsed.data.residentialName.trim(),
      legalRepresentative: parsed.data.legalRepresentative.trim(),
      representativeEmail: parsed.data.representativeEmail.toLowerCase(),
      representativePhone: parsed.data.representativePhone.trim(),
      servicePlan: parsed.data.servicePlan.trim(),
      monthlyAmount: parsed.data.monthlyAmount,
      startsOn,
      endsOn,
      terms: parsed.data.terms?.trim() || null,
      createdById: session.userId,
    },
  });

  revalidatePath("/super-admin");
  return "Contrato de servicio creado correctamente.";
}

export async function toggleResidentialSuspensionAction(formData: FormData) {
  await requireRole(["SUPER_ADMIN"]);
  const parsed = toggleResidentialSuspensionSchema.safeParse({
    residentialId: formData.get("residentialId"),
    nextStatus: formData.get("nextStatus"),
  });
  if (!parsed.success) return;

  const shouldSuspend = parsed.data.nextStatus === "suspend";
  await prisma.residential.update({
    where: { id: parsed.data.residentialId },
    data: {
      isSuspended: shouldSuspend,
      suspendedAt: shouldSuspend ? new Date() : null,
    },
  });

  revalidatePath("/super-admin");
}
