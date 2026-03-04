"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function acceptAnnouncedVisitAction(formData: FormData) {
  const session = await requireRole(["GUARD"]);
  if (!session.residentialId) return;

  const qrId = String(formData.get("qrId") ?? "");
  if (!qrId) return;

  const qr = await prisma.qrCode.findFirst({
    where: {
      id: qrId,
      residentialId: session.residentialId,
      isRevoked: false,
      validUntil: { gte: new Date() },
    },
    include: {
      scans: {
        where: { isValid: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!qr) return;
  if (qr.scans.length > 0) {
    revalidatePath("/guard");
    return;
  }
  if (qr.usedCount >= qr.maxUses) {
    revalidatePath("/guard");
    return;
  }

  await prisma.$transaction([
    prisma.qrCode.update({
      where: { id: qr.id },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.qrScan.create({
      data: {
        codeId: qr.id,
        scannerId: session.userId,
        isValid: true,
        reason: "Llegada confirmada manualmente por guardia.",
      },
    }),
  ]);

  revalidatePath("/guard");
}
