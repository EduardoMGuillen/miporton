"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  fullName: z.string().min(3, "Nombre invalido."),
  email: z.string().email("Correo invalido."),
  password: z.string().min(6, "El password debe tener minimo 6 caracteres."),
  role: z.enum(["RESIDENT", "GUARD"]),
});

export async function createResidentialUserAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
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
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/residential-admin");
  return "Usuario creado correctamente.";
}
