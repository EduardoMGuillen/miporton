import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { validateAndConsumeQr } from "@/lib/qr";
import { notifyUser } from "@/lib/push";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "GUARD") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as { code?: string };
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Debes enviar un codigo." }, { status: 400 });
  }

  const result = await validateAndConsumeQr({
    scannedCode: code,
    scannerId: session.userId,
    scannerResidentialId: session.residentialId,
  });

  if (result.valid && result.residentId && result.visitorName) {
    await notifyUser(result.residentId, {
      title: "MiPorton",
      body: `Tu visita (${result.visitorName}) ha llegado!`,
      url: "/resident",
    });
  }

  return NextResponse.json(result);
}
