import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { validateAndConsumeQr } from "@/lib/qr";
import { notifyUser } from "@/lib/push";
import { uploadIdPhotoToCloudinary, validateIdPhotoFile } from "@/lib/id-photo-storage";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "GUARD") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formData = await request.formData();
  const code = String(formData.get("code") ?? "").trim();
  const idPhoto = formData.get("idPhoto");

  if (!code) {
    return NextResponse.json({ error: "Debes enviar un codigo." }, { status: 400 });
  }
  if (!(idPhoto instanceof File)) {
    return NextResponse.json({ error: "Debes tomar una foto del ID del visitante." }, { status: 400 });
  }

  try {
    validateIdPhotoFile(idPhoto);
    const upload = await uploadIdPhotoToCloudinary(idPhoto);

    const result = await validateAndConsumeQr({
      scannedCode: code,
      scannerId: session.userId,
      scannerResidentialId: session.residentialId,
      consume: true,
      scanEvidence: {
        idPhotoUrl: upload.url,
        idPhotoMimeType: idPhoto.type,
        idPhotoSize: idPhoto.size,
      },
    });

    if (result.valid && result.residentId && result.visitorName) {
      await notifyUser(result.residentId, {
        title: "MiPorton",
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
