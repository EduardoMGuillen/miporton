"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const createResidentialSchema = z.object({
  residentialName: z.string().min(3, "Nombre de residencial invalido."),
  adminName: z.string().min(3, "Nombre del admin invalido."),
  adminEmail: z.string().email("Correo del admin invalido."),
  adminPassword: z.string().min(6, "El password debe tener minimo 6 caracteres."),
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
