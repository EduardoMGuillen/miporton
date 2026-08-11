"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const createPatrolZoneSchema = z.object({
  name: z.string().min(2, "Nombre invalido.").max(80, "Nombre demasiado largo."),
  description: z.string().max(180, "Descripcion demasiado larga.").optional(),
});

export async function createPatrolZoneAction(_prevState: string | null, formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return "Sesion invalida sin residencial asociada.";

  const parsed = createPatrolZoneSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Datos invalidos.";

  const name = parsed.data.name.trim();
  const existing = await prisma.patrolZone.findFirst({
    where: {
      residentialId: session.residentialId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (existing) return "Ya existe una zona de patrullaje con ese nombre.";

  await prisma.patrolZone.create({
    data: {
      name,
      description: parsed.data.description?.trim() || null,
      code: randomUUID().replaceAll("-", ""),
      residentialId: session.residentialId,
    },
  });

  revalidatePath("/residential-admin/patrullaje");
  return "Zona de patrullaje creada. Imprime o descarga el QR para el sticker.";
}

export async function deactivatePatrolZoneAction(formData: FormData) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) return;

  const zoneId = String(formData.get("zoneId") ?? "");
  if (!zoneId) return;

  await prisma.patrolZone.updateMany({
    where: {
      id: zoneId,
      residentialId: session.residentialId,
      isActive: true,
    },
    data: { isActive: false },
  });

  revalidatePath("/residential-admin/patrullaje");
}
