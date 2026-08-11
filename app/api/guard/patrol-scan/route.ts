import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { recordPatrolCheck } from "@/lib/patrol";

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

  const result = await recordPatrolCheck({
    scannedCode: code,
    guardId: session.userId,
    residentialId: session.residentialId,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
