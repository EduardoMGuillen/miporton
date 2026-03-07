import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { validateAndConsumeQr } from "@/lib/qr";
import { notifyUser } from "@/lib/push";
import { idPhotoFileToBytes, validateIdPhotoFile } from "@/lib/id-photo-storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "GUARD") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const code = String(formData.get("code") ?? "").trim();
  const idPhoto = formData.get("idPhoto");
  const platePhoto = formData.get("platePhoto");

  if (!code) {
    return NextResponse.json({ error: "Debes enviar un codigo." }, { status: 400 });
  }
  if (!(idPhoto instanceof File)) {
    return NextResponse.json({ error: "Debes tomar una foto del ID del visitante." }, { status: 400 });
  }

  try {
    validateIdPhotoFile(idPhoto);
    const idPhotoData = await idPhotoFileToBytes(idPhoto);
    const preValidation = await validateAndConsumeQr({
      scannedCode: code,
      scannerId: session.userId,
      scannerResidentialId: session.residentialId,
      consume: false,
    });
    if (!preValidation.valid) {
      return NextResponse.json(preValidation);
    }

    let platePhotoData: Uint8Array | undefined;
    let platePhotoMimeType: string | undefined;
    let platePhotoSize: number | undefined;
    if (preValidation.hasVehicle) {
      if (!(platePhoto instanceof File)) {
        return NextResponse.json(
          { error: "Este QR requiere foto de placa porque la visita viene en vehiculo." },
          { status: 400 },
        );
      }
      validateIdPhotoFile(platePhoto);
      platePhotoData = await idPhotoFileToBytes(platePhoto);
      platePhotoMimeType = platePhoto.type;
      platePhotoSize = platePhoto.size;
    }

    const result = await validateAndConsumeQr({
      scannedCode: code,
      scannerId: session.userId,
      scannerResidentialId: session.residentialId,
      consume: true,
      scanEvidence: {
        idPhotoData,
        idPhotoMimeType: idPhoto.type,
        idPhotoSize: idPhoto.size,
        platePhotoData,
        platePhotoMimeType,
        platePhotoSize,
      },
    });

    if (result.valid && result.residentId && result.visitorName) {
      await notifyUser(result.residentId, {
        title: "MiVisita",
        body: `Tu visita (${result.visitorName}) ha llegado!`,
        url: "/resident",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar la foto del ID.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
