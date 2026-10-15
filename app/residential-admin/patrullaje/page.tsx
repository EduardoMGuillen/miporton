import QRCode from "qrcode";
import { Card } from "@/app/components/shell";
import { CreatePatrolZoneForm } from "@/app/residential-admin/create-patrol-zone-form";
import { PatrolDashboard } from "@/app/residential-admin/patrol-dashboard";
import { PatrolQrShareActions } from "@/app/residential-admin/patrol-qr-share-actions";
import { deactivatePatrolZoneAction } from "@/app/residential-admin/patrullaje-actions";
import { requireRole } from "@/lib/authorization";
import { patrolPayloadFromCode } from "@/lib/patrol";
import {
  addDaysToKey,
  buildPatrolStats,
  daysBetweenKeys,
  rangeBoundsUtc,
  resolvePatrolRange,
} from "@/lib/patrol-stats";
import { prisma } from "@/lib/prisma";

const MAX_CHECK_ROWS = 5000;

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ResidentialAdminPatrullajePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }
  const residentialId = session.residentialId;

  const params = await searchParams;
  const { from, to, today } = resolvePatrolRange(
    getSingleParam(params.desde).trim(),
    getSingleParam(params.hasta).trim(),
  );
  const zoneFilter = getSingleParam(params.zona).trim();
  const guardFilter = getSingleParam(params.guardia).trim();
  const { start, end } = rangeBoundsUtc(from, to);
  const spanDays = daysBetweenKeys(from, to) + 1;
  const previousBounds = rangeBoundsUtc(addDaysToKey(from, -spanDays), addDaysToKey(from, -1));
  const checkFilters = {
    residentialId,
    ...(zoneFilter ? { zoneId: zoneFilter } : {}),
    ...(guardFilter ? { guardId: guardFilter } : {}),
  };

  const [residential, activeZones, inactiveZones, allZones, guards, rangeChecks, previousTotal] = await Promise.all([
    prisma.residential.findUnique({
      where: { id: residentialId },
      select: { name: true },
    }),
    prisma.patrolZone.findMany({
      where: { residentialId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.patrolZone.findMany({
      where: { residentialId, isActive: false },
      orderBy: { name: "asc" },
      take: 40,
    }),
    prisma.patrolZone.findMany({
      where: { residentialId },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: { id: true, name: true, isActive: true },
    }),
    prisma.user.findMany({
      where: { residentialId, role: "GUARD" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, isSuspended: true },
    }),
    prisma.patrolCheck.findMany({
      where: { ...checkFilters, checkedAt: { gte: start, lt: end } },
      orderBy: { checkedAt: "desc" },
      take: MAX_CHECK_ROWS,
      select: {
        id: true,
        checkedAt: true,
        zoneId: true,
        guardId: true,
        zone: { select: { name: true } },
        guard: { select: { fullName: true } },
      },
    }),
    prisma.patrolCheck.count({
      where: { ...checkFilters, checkedAt: { gte: previousBounds.start, lt: previousBounds.end } },
    }),
  ]);

  const stats = buildPatrolStats(
    rangeChecks.map((check) => ({
      id: check.id,
      checkedAt: check.checkedAt,
      zoneId: check.zoneId,
      guardId: check.guardId,
      zoneName: check.zone.name,
      guardName: check.guard.fullName,
    })),
    from,
    to,
  );

  const heatmapZones = allZones
    .filter((zone) => (zoneFilter ? zone.id === zoneFilter : zone.isActive || stats.byZone.has(zone.id)))
    .map((zone) => ({ id: zone.id, name: zone.name, note: zone.isActive ? undefined : "inactiva" }));

  const zonesWithQr = await Promise.all(
    activeZones.map(async (zone) => ({
      ...zone,
      image: await QRCode.toDataURL(patrolPayloadFromCode(zone.code)),
    })),
  );

  return (
    <>
      <PatrolDashboard
        stats={stats}
        from={from}
        to={to}
        today={today}
        zoneId={zoneFilter}
        guardId={guardFilter}
        zoneOptions={allZones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          note: zone.isActive ? undefined : "inactiva",
        }))}
        guardOptions={guards.map((guard) => ({
          id: guard.id,
          name: guard.fullName,
          note: guard.isSuspended ? "suspendido" : undefined,
        }))}
        heatmapZones={heatmapZones}
        activeZoneIds={activeZones.map((zone) => zone.id)}
        previousTotal={previousTotal}
        truncated={rangeChecks.length >= MAX_CHECK_ROWS}
      />

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Zonas de patrullaje</h2>
        <p className="mb-4 text-sm text-slate-600">
          Crea zonas con QR permanente para stickers. El guardia las escanea en &quot;Guardar
          Patrullaje&quot;; no afectan los QRs de visitas.
        </p>
        <CreatePatrolZoneForm />
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
            Zonas activas ({zonesWithQr.length})
          </summary>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {zonesWithQr.map((zone) => (
              <article
                key={zone.id}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="min-h-[3.25rem]">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900">{zone.name}</p>
                  <p className="mt-0.5 line-clamp-2 min-h-[2rem] text-xs text-slate-600">
                    {zone.description || "Sin descripcion"}
                  </p>
                </div>
                <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-center text-[10px] text-slate-500">
                  {patrolPayloadFromCode(zone.code)}
                </p>
                <div className="mt-3 flex flex-1 items-center justify-center">
                  <div className="aspect-square w-full max-w-[11rem] rounded-lg border border-slate-200 bg-white p-2">
                    {/* Data URL from QRCode.toDataURL — native img is intentional */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={zone.image}
                      alt={`QR patrullaje ${zone.name}`}
                      className="h-full w-full object-contain"
                    />
                  </div>
                </div>
                <div className="mt-auto pt-3">
                  <PatrolQrShareActions
                    qrDataUrl={zone.image}
                    zoneName={zone.name}
                    code={zone.code}
                    residentialName={residential?.name ?? "Residencial"}
                  />
                  <form action={deactivatePatrolZoneAction} className="mt-3 text-center">
                    <input type="hidden" name="zoneId" value={zone.id} />
                    <button type="submit" className="text-xs font-medium text-red-700 hover:underline">
                      Desactivar zona
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {zonesWithQr.length === 0 ? (
              <p className="text-sm text-slate-600 sm:col-span-2 xl:col-span-3">
                Aun no hay zonas de patrullaje activas.
              </p>
            ) : null}
          </div>
        </details>
      </Card>

      {inactiveZones.length > 0 ? (
        <Card>
          <details>
            <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
              Zonas desactivadas ({inactiveZones.length})
            </summary>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {inactiveZones.map((zone) => (
                <li key={zone.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  {zone.name}
                  {zone.description ? (
                    <span className="text-slate-500"> — {zone.description}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        </Card>
      ) : null}
    </>
  );
}
