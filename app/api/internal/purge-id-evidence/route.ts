import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - THIRTY_DAYS_IN_MS);
  const purgeResult = await prisma.qrScan.updateMany({
    where: {
      idPhotoData: { not: null },
      OR: [{ idCapturedAt: { lt: cutoff } }, { idCapturedAt: null, scannedAt: { lt: cutoff } }],
    },
    data: {
      idPhotoData: null,
      idPhotoMimeType: null,
      idPhotoSize: null,
    },
  });

  return NextResponse.json({
    ok: true,
    purged: purgeResult.count,
    cutoffIso: cutoff.toISOString(),
  });
}
