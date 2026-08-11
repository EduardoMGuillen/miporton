import QRCode from "qrcode";
import { Card } from "@/app/components/shell";
import { CreatePatrolZoneForm } from "@/app/residential-admin/create-patrol-zone-form";
import { PatrolQrShareActions } from "@/app/residential-admin/patrol-qr-share-actions";
import { deactivatePatrolZoneAction } from "@/app/residential-admin/patrullaje-actions";
import { requireRole } from "@/lib/authorization";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { patrolPayloadFromCode } from "@/lib/patrol";
import { prisma } from "@/lib/prisma";

export default async function ResidentialAdminPatrullajePage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const [residential, activeZones, inactiveZones, recentChecks] = await Promise.all([
    prisma.residential.findUnique({
      where: { id: session.residentialId },
      select: { name: true },
    }),
    prisma.patrolZone.findMany({
      where: { residentialId: session.residentialId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.patrolZone.findMany({
      where: { residentialId: session.residentialId, isActive: false },
      orderBy: { name: "asc" },
      take: 40,
    }),
    prisma.patrolCheck.findMany({
      where: { residentialId: session.residentialId },
      orderBy: { checkedAt: "desc" },
      take: 80,
      select: {
        id: true,
        checkedAt: true,
        zone: { select: { name: true } },
        guard: { select: { fullName: true } },
      },
    }),
  ]);

  const zonesWithQr = await Promise.all(
    activeZones.map(async (zone) => ({
      ...zone,
      image: await QRCode.toDataURL(patrolPayloadFromCode(zone.code)),
    })),
  );

  return (
    <>
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Patrullaje</h2>
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

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Historial reciente ({recentChecks.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2 font-semibold">Zona</th>
                <th className="px-2 py-2 font-semibold">Guardia</th>
                <th className="px-2 py-2 font-semibold">Hora</th>
              </tr>
            </thead>
            <tbody>
              {recentChecks.map((check) => (
                <tr key={check.id} className="border-b border-slate-100">
                  <td className="px-2 py-2 text-slate-900">{check.zone.name}</td>
                  <td className="px-2 py-2 text-slate-700">{check.guard.fullName}</td>
                  <td className="px-2 py-2 text-slate-600">
                    {formatDateTimeTegucigalpa(check.checkedAt)}
                  </td>
                </tr>
              ))}
              {recentChecks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-2 py-3 text-slate-600">
                    Todavia no hay marcajes de patrullaje.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
