import { Card } from "@/app/components/shell";
import { CreateZoneForm } from "@/app/residential-admin/create-zone-form";
import { CreateZoneBlockForm } from "@/app/residential-admin/create-zone-block-form";
import { cancelZoneReservationByAdminAction } from "@/app/residential-admin/actions";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function defaultMonthValue() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function normalizeMonth(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  return defaultMonthValue();
}

function monthRange(monthValue: string) {
  const normalized = normalizeMonth(monthValue);
  const [yearRaw, monthRaw] = normalized.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1),
  };
}

export default async function ResidentialAdminZonesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const params = await searchParams;
  const selectedMonth = normalizeMonth(getSingleParam(params.month) || defaultMonthValue());
  const reservationStatusFilter = getSingleParam(params.status).trim();
  const { start: monthStart, end: monthEnd } = monthRange(selectedMonth);

  const zones = await prisma.zone.findMany({
    where: { residentialId: session.residentialId },
    orderBy: { name: "asc" },
    take: 60,
  });

  const zoneReservations = await prisma.zoneReservation.findMany({
    where: {
      residentialId: session.residentialId,
      startsAt: { gte: monthStart, lt: monthEnd },
      ...(reservationStatusFilter ? { status: reservationStatusFilter as "APPROVED" | "CANCELLED" } : {}),
    },
    include: {
      zone: { select: { name: true } },
      resident: { select: { fullName: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  const zoneBlocks = await prisma.zoneBlock.findMany({
    where: {
      residentialId: session.residentialId,
      startsAt: { gte: monthStart, lt: monthEnd },
    },
    include: {
      zone: { select: { name: true } },
      createdBy: { select: { fullName: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Zonas y reservas</h2>
        <CreateZoneForm />
        <div className="mt-4">
          <CreateZoneBlockForm zones={zones.map((zone) => ({ id: zone.id, name: zone.name }))} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {zones.map((zone) => (
            <div key={zone.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{zone.name}</p>
              <p className="text-xs text-slate-600">
                Maximo por reserva: {zone.maxHoursPerReservation} hora(s) | Estado:{" "}
                {zone.isActive ? "Activa" : "Inactiva"}
              </p>
              {zone.description ? <p className="text-xs text-slate-500">{zone.description}</p> : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Calendario de reservas y bloqueos</h2>
        <form className="grid gap-2 md:grid-cols-3">
          <input type="month" name="month" defaultValue={selectedMonth} className="field-base" />
          <select name="status" defaultValue={reservationStatusFilter} className="field-base">
            <option value="">Reservas: todas</option>
            <option value="APPROVED">Solo activas</option>
            <option value="CANCELLED">Solo canceladas</option>
          </select>
          <button className="btn-primary w-full">Aplicar</button>
        </form>

        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Reservas del mes</h3>
          <div className="mt-2 grid gap-2">
            {zoneReservations.map((reservation) => (
              <div key={reservation.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {reservation.zone.name} - {reservation.resident.fullName}
                </p>
                <p className="text-xs text-slate-600">
                  {formatDateTimeTegucigalpa(reservation.startsAt)} -{" "}
                  {formatDateTimeTegucigalpa(reservation.endsAt)}
                </p>
                <p className="text-xs text-slate-500">
                  Estado: {reservation.status === "APPROVED" ? "Activa" : "Cancelada"}
                </p>
                {reservation.note ? <p className="text-xs text-slate-500">{reservation.note}</p> : null}
                {reservation.status === "APPROVED" ? (
                  <form action={cancelZoneReservationByAdminAction} className="mt-2">
                    <input type="hidden" name="reservationId" value={reservation.id} />
                    <button className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                      Cancelar reserva (admin)
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
            {zoneReservations.length === 0 ? (
              <p className="text-sm text-slate-600">No hay reservas en este mes/filtro.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Bloqueos del mes</h3>
          <div className="mt-2 grid gap-2">
            {zoneBlocks.map((block) => (
              <div key={block.id} className="rounded-lg border border-slate-200 bg-red-50/70 p-3">
                <p className="text-sm font-semibold text-slate-900">{block.zone.name}</p>
                <p className="text-xs text-slate-600">
                  {formatDateTimeTegucigalpa(block.startsAt)} - {formatDateTimeTegucigalpa(block.endsAt)}
                </p>
                <p className="text-xs text-slate-500">Creado por: {block.createdBy.fullName}</p>
                {block.reason ? <p className="text-xs text-slate-500">{block.reason}</p> : null}
              </div>
            ))}
            {zoneBlocks.length === 0 ? (
              <p className="text-sm text-slate-600">No hay bloqueos en este mes.</p>
            ) : null}
          </div>
        </div>
      </Card>
    </>
  );
}
