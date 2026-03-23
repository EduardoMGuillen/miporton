import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { idPhotoFileToBytes, validateIdPhotoFile } from "@/lib/id-photo-storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "GUARD" || !session.residentialId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const qrId = String(formData.get("qrId") ?? "").trim();
  const idPhoto = formData.get("idPhoto");
  const platePhoto = formData.get("platePhoto");

  if (!qrId) {
    return NextResponse.json({ error: "QR invalido." }, { status: 400 });
  }
  if (!(idPhoto instanceof File)) {
    return NextResponse.json({ error: "Debes tomar una foto del ID del visitante." }, { status: 400 });
  }

  try {
    validateIdPhotoFile(idPhoto);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo validar la foto del ID.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

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

  if (!qr) {
    return NextResponse.json({ error: "QR no disponible para llegada manual." }, { status: 404 });
  }
  if (qr.scans.length > 0 || qr.usedCount >= qr.maxUses) {
    return NextResponse.json({ error: "Este anuncio ya fue procesado o agotado." }, { status: 400 });
  }

  const idPhotoData = await idPhotoFileToBytes(idPhoto);

  let platePhotoData: Uint8Array | null = null;
  let platePhotoMimeType: string | null = null;
  let platePhotoSize: number | null = null;
  if (qr.hasVehicle) {
    if (!(platePhoto instanceof File)) {
      return NextResponse.json(
        { error: "Este QR requiere foto de placa porque la visita viene en vehiculo." },
        { status: 400 },
      );
    }
    try {
      validateIdPhotoFile(platePhoto);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo validar la foto de placa.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    platePhotoData = await idPhotoFileToBytes(platePhoto);
    platePhotoMimeType = platePhoto.type;
    platePhotoSize = platePhoto.size;
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
        idPhotoData: idPhotoData as unknown as Uint8Array<ArrayBuffer>,
        idPhotoMimeType: idPhoto.type,
        idPhotoSize: idPhoto.size,
        idCapturedAt: new Date(),
        platePhotoData: platePhotoData
          ? (platePhotoData as unknown as Uint8Array<ArrayBuffer>)
          : null,
        platePhotoMimeType,
        platePhotoSize,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
