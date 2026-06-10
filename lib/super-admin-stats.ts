import type { PrismaClient } from "@prisma/client";

export type StatsPlatformId = "mivisita" | "dragon";
export type StatsPlatformFilter = "all" | StatsPlatformId;

export type ResidentialConsumptionRow = {
  key: string;
  residentialId: string;
  residentialName: string;
  platformId: StatsPlatformId;
  platformLabel: string;
  entries: number;
  exits: number;
  deliveries: number;
  qrCreated: number;
  total: number;
};

export type TrendRow = {
  monthKey: string;
  label: string;
  entries: number;
  exits: number;
  deliveries: number;
  qrCreated: number;
};

export type ActiveUsersByResidentialRow = {
  key: string;
  residentialId: string;
  residentialName: string;
  platformId: StatsPlatformId;
  platformLabel: string;
  activeUsers7d: number;
};

export type PlatformStatsSnapshot = {
  platformId: StatsPlatformId;
  platformLabel: string;
  available: boolean;
  error?: string;
  residentials: { id: string; name: string; isSuspended: boolean }[];
  activeResidentials: number;
  suspendedResidentials: number;
  totalUsers: number;
  entriesMonth: number;
  exitsMonth: number;
  deliveriesMonth: number;
  qrCreatedMonth: number;
  idEvidenceMonth: number;
  totalActiveUsers7d: number;
  usageRate: number;
  idEvidenceRate: number;
  topConsumption: ResidentialConsumptionRow[];
  activeUsers7dByResidential: ActiveUsersByResidentialRow[];
  trend: TrendRow[];
  maxTotalConsumption: number;
  maxEntries: number;
  maxDeliveries: number;
  maxActiveUsers7d: number;
  maxTrendValue: number;
  /** Conteo directo SQL (diagnostico permisos / BD vacia). */
  probe?: { users: number; residentials: number; scans: number };
};

function monthKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${value.getFullYear()}-${month}`;
}

function monthStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function monthShortLabel(value: Date) {
  return value.toLocaleDateString("es-HN", { month: "short", year: "2-digit" });
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function displayResidentialName(
  name: string,
  platformId: StatsPlatformId,
  platformLabel: string,
): string {
  return `${name} — ${platformLabel}`;
}

function emptySnapshot(
  platformId: StatsPlatformId,
  platformLabel: string,
  error?: string,
): PlatformStatsSnapshot {
  return {
    platformId,
    platformLabel,
    available: false,
    error,
    residentials: [],
    activeResidentials: 0,
    suspendedResidentials: 0,
    totalUsers: 0,
    entriesMonth: 0,
    exitsMonth: 0,
    deliveriesMonth: 0,
    qrCreatedMonth: 0,
    idEvidenceMonth: 0,
    totalActiveUsers7d: 0,
    usageRate: 0,
    idEvidenceRate: 0,
    topConsumption: [],
    activeUsers7dByResidential: [],
    trend: [],
    maxTotalConsumption: 1,
    maxEntries: 1,
    maxDeliveries: 1,
    maxActiveUsers7d: 1,
    maxTrendValue: 1,
  };
}

export async function fetchPlatformStats(
  db: PrismaClient,
  platformId: StatsPlatformId,
  platformLabel: string,
): Promise<PlatformStatsSnapshot> {
  const now = new Date();
  const currentMonthStart = monthStart(now);
  const nextMonthStart = addMonths(currentMonthStart, 1);
  const sixMonthsStart = addMonths(currentMonthStart, -5);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [
      residentials,
      totalUsers,
      entriesMonth,
      exitsMonth,
      deliveriesMonth,
      qrCreatedMonth,
      idEvidenceMonth,
      scansForConsumption,
      scansForExitsByResidential,
      deliveriesForConsumption,
      qrsForConsumption,
      scansForTrend,
      exitsForTrend,
      deliveriesForTrend,
      qrsForTrend,
      totalActiveUsers7d,
      activeUsersByResidential7d,
    ] = await Promise.all([
      db.residential.findMany({
        select: { id: true, name: true, isSuspended: true },
        orderBy: { name: "asc" },
      }),
      db.user.count(),
      db.qrScan.count({
        where: {
          isValid: true,
          scannedAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
      }),
      db.qrScan.count({
        where: {
          isValid: true,
          exitedAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
      }),
      db.deliveryAnnouncement.count({
        where: {
          createdAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
      }),
      db.qrCode.count({
        where: {
          createdAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
      }),
      db.qrScan.count({
        where: {
          isValid: true,
          scannedAt: { gte: currentMonthStart, lt: nextMonthStart },
          idPhotoData: { not: null },
        },
      }),
      db.qrScan.findMany({
        where: {
          isValid: true,
          scannedAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
        select: {
          code: {
            select: {
              residentialId: true,
              residential: { select: { name: true } },
            },
          },
        },
      }),
      db.qrScan.findMany({
        where: {
          isValid: true,
          exitedAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
        select: {
          code: {
            select: {
              residentialId: true,
              residential: { select: { name: true } },
            },
          },
        },
      }),
      db.deliveryAnnouncement.findMany({
        where: {
          createdAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
        select: {
          residentialId: true,
          residential: { select: { name: true } },
        },
      }),
      db.qrCode.findMany({
        where: {
          createdAt: { gte: currentMonthStart, lt: nextMonthStart },
        },
        select: {
          residentialId: true,
          residential: { select: { name: true } },
        },
      }),
      db.qrScan.findMany({
        where: {
          isValid: true,
          scannedAt: { gte: sixMonthsStart, lt: nextMonthStart },
        },
        select: { scannedAt: true },
      }),
      db.qrScan.findMany({
        where: {
          isValid: true,
          exitedAt: { gte: sixMonthsStart, lt: nextMonthStart },
        },
        select: { exitedAt: true },
      }),
      db.deliveryAnnouncement.findMany({
        where: {
          createdAt: { gte: sixMonthsStart, lt: nextMonthStart },
        },
        select: { createdAt: true },
      }),
      db.qrCode.findMany({
        where: {
          createdAt: { gte: sixMonthsStart, lt: nextMonthStart },
        },
        select: { createdAt: true },
      }),
      db.user.count({
        where: {
          residentialId: { not: null },
          lastLoginAt: { gte: sevenDaysAgo },
        },
      }),
      db.user.groupBy({
        by: ["residentialId"],
        where: {
          residentialId: { not: null },
          lastLoginAt: { gte: sevenDaysAgo },
        },
        _count: { _all: true },
      }),
    ]);

    const usageRate = qrCreatedMonth > 0 ? Math.round((entriesMonth / qrCreatedMonth) * 100) : 0;
    const idEvidenceRate =
      entriesMonth > 0 ? Math.round((idEvidenceMonth / entriesMonth) * 100) : 0;

    const residentialNameMap = new Map(residentials.map((item) => [item.id, item.name]));
    const consumptionMap = new Map<string, ResidentialConsumptionRow>();

    const ensureBucket = (residentialId: string, rawName: string) => {
      const key = `${platformId}:${residentialId}`;
      if (!consumptionMap.has(key)) {
        consumptionMap.set(key, {
          key,
          residentialId,
          residentialName: displayResidentialName(rawName, platformId, platformLabel),
          platformId,
          platformLabel,
          entries: 0,
          exits: 0,
          deliveries: 0,
          qrCreated: 0,
          total: 0,
        });
      }
      return consumptionMap.get(key)!;
    };

    for (const scan of scansForConsumption) {
      const id = scan.code.residentialId;
      const bucket = ensureBucket(id, scan.code.residential.name);
      bucket.entries += 1;
    }
    for (const scan of scansForExitsByResidential) {
      const id = scan.code.residentialId;
      const bucket = ensureBucket(id, scan.code.residential.name);
      bucket.exits += 1;
    }
    for (const delivery of deliveriesForConsumption) {
      const bucket = ensureBucket(delivery.residentialId, delivery.residential.name);
      bucket.deliveries += 1;
    }
    for (const qr of qrsForConsumption) {
      const id = qr.residentialId;
      const name = qr.residential?.name ?? residentialNameMap.get(id) ?? "Residencial";
      const bucket = ensureBucket(id, name);
      bucket.qrCreated += 1;
    }

    const topConsumption = Array.from(consumptionMap.values())
      .map((item) => ({
        ...item,
        total: item.entries + item.deliveries,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const maxTotalConsumption = Math.max(...topConsumption.map((item) => item.total), 1);
    const maxEntries = Math.max(...topConsumption.map((item) => item.entries), 1);
    const maxDeliveries = Math.max(...topConsumption.map((item) => item.deliveries), 1);

    const trend: TrendRow[] = [];
    const trendMap = new Map<string, TrendRow>();
    for (let index = 0; index < 6; index += 1) {
      const monthDate = addMonths(sixMonthsStart, index);
      const key = monthKey(monthDate);
      const base: TrendRow = {
        monthKey: key,
        label: monthShortLabel(monthDate),
        entries: 0,
        exits: 0,
        deliveries: 0,
        qrCreated: 0,
      };
      trendMap.set(key, base);
      trend.push(base);
    }
    for (const scan of scansForTrend) {
      const key = monthKey(scan.scannedAt);
      const bucket = trendMap.get(key);
      if (bucket) bucket.entries += 1;
    }
    for (const scan of exitsForTrend) {
      if (!scan.exitedAt) continue;
      const key = monthKey(scan.exitedAt);
      const bucket = trendMap.get(key);
      if (bucket) bucket.exits += 1;
    }
    for (const delivery of deliveriesForTrend) {
      const key = monthKey(delivery.createdAt);
      const bucket = trendMap.get(key);
      if (bucket) bucket.deliveries += 1;
    }
    for (const qr of qrsForTrend) {
      const key = monthKey(qr.createdAt);
      const bucket = trendMap.get(key);
      if (bucket) bucket.qrCreated += 1;
    }

    const maxTrendValue = Math.max(
      ...trend.flatMap((item) => [item.entries, item.exits, item.deliveries, item.qrCreated]),
      1,
    );

    const activeUsers7dByResidential: ActiveUsersByResidentialRow[] = activeUsersByResidential7d
      .filter((item) => item.residentialId)
      .map((item) => {
        const residentialId = item.residentialId as string;
        const rawName = residentialNameMap.get(residentialId) ?? "Residencial";
        return {
          key: `${platformId}:${residentialId}`,
          residentialId,
          residentialName: displayResidentialName(rawName, platformId, platformLabel),
          platformId,
          platformLabel,
          activeUsers7d: item._count._all,
        };
      })
      .sort((a, b) => b.activeUsers7d - a.activeUsers7d);

    const maxActiveUsers7d = Math.max(
      ...activeUsers7dByResidential.map((item) => item.activeUsers7d),
      1,
    );

    const activeResidentials = residentials.filter((item) => !item.isSuspended).length;
    const suspendedResidentials = residentials.length - activeResidentials;

    let probe: PlatformStatsSnapshot["probe"];
    if (platformId === "dragon") {
      try {
        const [row] = await db.$queryRaw<
          [{ users: bigint; residentials: bigint; scans: bigint }]
        >`
          SELECT
            (SELECT COUNT(*)::bigint FROM "User") AS users,
            (SELECT COUNT(*)::bigint FROM "Residential") AS residentials,
            (SELECT COUNT(*)::bigint FROM "QrScan") AS scans
        `;
        if (row) {
          probe = {
            users: Number(row.users),
            residentials: Number(row.residentials),
            scans: Number(row.scans),
          };
        }
      } catch {
        probe = undefined;
      }
    }

    return {
      platformId,
      platformLabel,
      available: true,
      residentials,
      activeResidentials,
      suspendedResidentials,
      totalUsers,
      entriesMonth,
      exitsMonth,
      deliveriesMonth,
      qrCreatedMonth,
      idEvidenceMonth,
      totalActiveUsers7d,
      usageRate,
      idEvidenceRate,
      topConsumption,
      activeUsers7dByResidential,
      trend,
      maxTotalConsumption,
      maxEntries,
      maxDeliveries,
      maxActiveUsers7d,
      maxTrendValue,
      probe,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de conexion";
    console.error(`[super-admin-stats:${platformId}]`, error);
    return emptySnapshot(platformId, platformLabel, message);
  }
}

export function parseStatsPlatformFilter(raw: string | undefined): StatsPlatformFilter {
  if (raw === "mivisita" || raw === "dragon") return raw;
  return "all";
}

export type MergedSuperAdminStats = {
  filter: StatsPlatformFilter;
  dragonConfigured: boolean;
  dragonError?: string;
  mivisita: PlatformStatsSnapshot;
  dragon: PlatformStatsSnapshot | null;
  totals: {
    residentials: number;
    activeResidentials: number;
    suspendedResidentials: number;
    totalUsers: number;
    entriesMonth: number;
    exitsMonth: number;
    deliveriesMonth: number;
    qrCreatedMonth: number;
    idEvidenceMonth: number;
    totalActiveUsers7d: number;
  };
  usageRate: number;
  idEvidenceRate: number;
  topConsumption: ResidentialConsumptionRow[];
  activeUsers7dByResidential: ActiveUsersByResidentialRow[];
  trend: TrendRow[];
  maxTotalConsumption: number;
  maxEntries: number;
  maxDeliveries: number;
  maxActiveUsers7d: number;
  maxTrendValue: number;
};

function sumSnapshots(snapshots: PlatformStatsSnapshot[]) {
  return snapshots.reduce(
    (acc, s) => ({
      residentials: acc.residentials + s.residentials.length,
      activeResidentials: acc.activeResidentials + s.activeResidentials,
      suspendedResidentials: acc.suspendedResidentials + s.suspendedResidentials,
      totalUsers: acc.totalUsers + s.totalUsers,
      entriesMonth: acc.entriesMonth + s.entriesMonth,
      exitsMonth: acc.exitsMonth + s.exitsMonth,
      deliveriesMonth: acc.deliveriesMonth + s.deliveriesMonth,
      qrCreatedMonth: acc.qrCreatedMonth + s.qrCreatedMonth,
      idEvidenceMonth: acc.idEvidenceMonth + s.idEvidenceMonth,
      totalActiveUsers7d: acc.totalActiveUsers7d + s.totalActiveUsers7d,
    }),
    {
      residentials: 0,
      activeResidentials: 0,
      suspendedResidentials: 0,
      totalUsers: 0,
      entriesMonth: 0,
      exitsMonth: 0,
      deliveriesMonth: 0,
      qrCreatedMonth: 0,
      idEvidenceMonth: 0,
      totalActiveUsers7d: 0,
    },
  );
}

function mergeTrends(snapshots: PlatformStatsSnapshot[]): TrendRow[] {
  const map = new Map<string, TrendRow>();
  for (const snapshot of snapshots) {
    for (const row of snapshot.trend) {
      const existing = map.get(row.monthKey);
      if (!existing) {
        map.set(row.monthKey, { ...row });
      } else {
        existing.entries += row.entries;
        existing.exits += row.exits;
        existing.deliveries += row.deliveries;
        existing.qrCreated += row.qrCreated;
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export function mergeSuperAdminStats(input: {
  filter: StatsPlatformFilter;
  dragonConfigured: boolean;
  mivisita: PlatformStatsSnapshot;
  dragon: PlatformStatsSnapshot | null;
}): MergedSuperAdminStats {
  const { filter, dragonConfigured, mivisita, dragon } = input;

  const activeSnapshots: PlatformStatsSnapshot[] = [];
  if (filter === "all" || filter === "mivisita") activeSnapshots.push(mivisita);
  if ((filter === "all" || filter === "dragon") && dragon?.available) {
    activeSnapshots.push(dragon);
  }

  const totals = sumSnapshots(activeSnapshots);
  const usageRate =
    totals.qrCreatedMonth > 0
      ? Math.round((totals.entriesMonth / totals.qrCreatedMonth) * 100)
      : 0;
  const idEvidenceRate =
    totals.entriesMonth > 0
      ? Math.round((totals.idEvidenceMonth / totals.entriesMonth) * 100)
      : 0;

  const topConsumption = activeSnapshots
    .flatMap((s) => s.topConsumption)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const activeUsers7dByResidential = activeSnapshots
    .flatMap((s) => s.activeUsers7dByResidential)
    .sort((a, b) => b.activeUsers7d - a.activeUsers7d);

  const trend = mergeTrends(activeSnapshots);

  return {
    filter,
    dragonConfigured,
    dragonError: dragon && !dragon.available ? dragon.error : undefined,
    mivisita,
    dragon,
    totals,
    usageRate,
    idEvidenceRate,
    topConsumption,
    activeUsers7dByResidential,
    trend,
    maxTotalConsumption: Math.max(...topConsumption.map((i) => i.total), 1),
    maxEntries: Math.max(...topConsumption.map((i) => i.entries), 1),
    maxDeliveries: Math.max(...topConsumption.map((i) => i.deliveries), 1),
    maxActiveUsers7d: Math.max(...activeUsers7dByResidential.map((i) => i.activeUsers7d), 1),
    maxTrendValue: Math.max(
      ...trend.flatMap((i) => [i.entries, i.exits, i.deliveries, i.qrCreated]),
      1,
    ),
  };
}

export { percent };
