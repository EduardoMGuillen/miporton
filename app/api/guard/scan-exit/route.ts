import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { registerQrExit } from "@/lib/qr";

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

  const result = await registerQrExit({
    scannedCode: code,
    scannerResidentialId: session.residentialId,
  });

  return NextResponse.json(result);
}
