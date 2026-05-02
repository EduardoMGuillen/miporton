import { NextResponse } from "next/server";
import { calendarMonthKeyFromDate } from "@/lib/calendar-month-key";
import { REPORT_BACKUP_MAX_SCANS_PER_MONTH } from "@/lib/reports-backup-constants";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ManifestItem = {
  residentialId: string;
  month: string;
  residentialName: string;
};

type SkippedItem = {
  residentialName: string;
  month: string;
  scanCount: number;
};

function pairKey(residentialId: string, month: string) {
  return `${residentialId}\t${month}`;
}

function parsePairKey(key: string) {
  const tab = key.indexOf("\t");
  return { residentialId: key.slice(0, tab), month: key.slice(tab + 1) };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const [scans, deliveries, residentials] = await Promise.all([
      prisma.qrScan.findMany({
        where: { isValid: true },
        select: {
          scannedAt: true,
          code: { select: { residentialId: true } },
        },
      }),
      prisma.deliveryAnnouncement.findMany({
        select: { createdAt: true, residentialId: true },
      }),
      prisma.residential.findMany({
        select: { id: true, name: true },
      }),
    ]);

    const nameById = new Map(residentials.map((r) => [r.id, r.name]));
    const activeMonths = new Set<string>();
    const scanCountByPair = new Map<string, number>();

    for (const s of scans) {
      const month = calendarMonthKeyFromDate(s.scannedAt);
      const key = pairKey(s.code.residentialId, month);
      activeMonths.add(key);
      scanCountByPair.set(key, (scanCountByPair.get(key) ?? 0) + 1);
    }
    for (const d of deliveries) {
      const month = calendarMonthKeyFromDate(d.createdAt);
      activeMonths.add(pairKey(d.residentialId, month));
    }

    const items: ManifestItem[] = [];
    const skipped: SkippedItem[] = [];

    for (const key of activeMonths) {
      const { residentialId, month } = parsePairKey(key);
      const scanCount = scanCountByPair.get(key) ?? 0;
      const residentialName = nameById.get(residentialId) ?? residentialId;
      if (scanCount > REPORT_BACKUP_MAX_SCANS_PER_MONTH) {
        skipped.push({ residentialName, month, scanCount });
      } else {
        items.push({ residentialId, month, residentialName });
      }
    }

    items.sort((a, b) => {
      const byName = a.residentialName.localeCompare(b.residentialName, "es");
      if (byName !== 0) return byName;
      return a.month.localeCompare(b.month);
    });
    skipped.sort((a, b) => {
      const byName = a.residentialName.localeCompare(b.residentialName, "es");
      if (byName !== 0) return byName;
      return a.month.localeCompare(b.month);
    });

    return NextResponse.json({
      items,
      skipped,
      maxScansPerMonth: REPORT_BACKUP_MAX_SCANS_PER_MONTH,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al armar el manifiesto.";
    console.error("[reports-backup-manifest]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
