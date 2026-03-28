import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scanId: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { scanId } = await params;
  const scan = await prisma.qrScan.findUnique({
    where: { id: scanId },
    select: {
      platePhotoData: true,
      platePhotoMimeType: true,
      code: { select: { residentialId: true } },
    },
  });

  if (!scan || !scan.platePhotoData || !scan.platePhotoMimeType) {
    return NextResponse.json({ error: "No existe evidencia de placa." }, { status: 404 });
  }

  if (session.role === "SUPER_ADMIN") {
    return new Response(scan.platePhotoData, {
      headers: { "Content-Type": scan.platePhotoMimeType },
    });
  }

  if (session.role === "RESIDENTIAL_ADMIN" && session.residentialId === scan.code.residentialId) {
    return new Response(scan.platePhotoData, {
      headers: { "Content-Type": scan.platePhotoMimeType },
    });
  }

  return NextResponse.json({ error: "No autorizado." }, { status: 403 });
}
