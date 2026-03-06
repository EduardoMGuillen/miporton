import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ scanId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (session.role !== "SUPER_ADMIN" && session.role !== "RESIDENTIAL_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { scanId } = await context.params;
  const scan = await prisma.qrScan.findUnique({
    where: { id: scanId },
    select: {
      idPhotoData: true,
      idPhotoMimeType: true,
      code: { select: { residentialId: true } },
    },
  });

  if (!scan || !scan.idPhotoData) {
    return NextResponse.json({ error: "Evidencia no encontrada." }, { status: 404 });
  }

  if (session.role === "RESIDENTIAL_ADMIN" && session.residentialId !== scan.code.residentialId) {
    return NextResponse.json({ error: "No autorizado para esta residencial." }, { status: 403 });
  }

  return new Response(scan.idPhotoData, {
    headers: {
      "Content-Type": scan.idPhotoMimeType ?? "application/octet-stream",
      "Cache-Control": "private, max-age=60",
    },
  });
}
