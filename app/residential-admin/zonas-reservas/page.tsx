import { Card } from "@/app/components/shell";
import { CreateAdminZoneReservationForm } from "@/app/residential-admin/create-admin-zone-reservation-form";
import { CreateZoneForm } from "@/app/residential-admin/create-zone-form";
import { CreateZoneBlockForm } from "@/app/residential-admin/create-zone-block-form";
import { ZoneConfigCard } from "@/app/residential-admin/zone-config-card";
import { ZonasReservasTabs } from "@/app/residential-admin/zonas-reservas-tabs";
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

  const [zones, residents, zoneReservations, zoneBlocks, pickerReservations, pickerBlocks] = await Promise.all([
    prisma.zone.findMany({
      where: { residentialId: session.residentialId },
      orderBy: { name: "asc" },
      take: 60,
    }),
    prisma.user.findMany({
      where: {
        residentialId: session.residentialId,
        role: "RESIDENT",
        isSuspended: false,
      },
      select: { id: true, fullName: true, houseNumber: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.zoneReservation.findMany({
      where: {
        residentialId: session.residentialId,
        startsAt: { gte: monthStart, lt: monthEnd },
        ...(reservationStatusFilter ? { status: reservationStatusFilter as "APPROVED" | "CANCELLED" } : {}),
      },
      include: {
        zone: { select: { name: true } },
        resident: { select: { fullName: true, houseNumber: true } },
      },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
    prisma.zoneBlock.findMany({
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
    }),
    prisma.zoneReservation.findMany({
      where: {
        residentialId: session.residentialId,
        status: "APPROVED",
      },
      select: { id: true, zoneId: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
      take: 800,
    }),
    prisma.zoneBlock.findMany({
      where: { residentialId: session.residentialId },
      select: { zoneId: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
      take: 400,
    }),
  ]);

  const activeZones = zones.filter((zone) => zone.isActive);
  const zoneOccupiedSlots = [
    ...pickerReservations.map((item) => ({
      zoneId: item.zoneId,
      startsAtIso: item.startsAt.toISOString(),
      endsAtIso: item.endsAt.toISOString(),
      source: "reservation" as const,
    })),
    ...pickerBlocks.map((item) => ({
      zoneId: item.zoneId,
      startsAtIso: item.startsAt.toISOString(),
      endsAtIso: item.endsAt.toISOString(),
      source: "block" as const,
    })),
  ];

  const reservasPanel = (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Reservar en nombre de un residente</h2>
        <p className="mb-4 text-sm text-slate-600">
          Registra una reserva con las reglas de horario de la zona. Como admin puedes reservar incluso en
          rangos bloqueados; los residentes no.
        </p>
        <CreateAdminZoneReservationForm
          residents={residents}
          zones={activeZones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            maxHoursPerReservation: zone.maxHoursPerReservation,
            oneReservationPerDay: zone.oneReservationPerDay,
            reservationWeekdaysMask: zone.reservationWeekdaysMask,
            scheduleStartHour: zone.scheduleStartHour,
            scheduleEndHour: zone.scheduleEndHour,
          }))}
          occupiedSlots={zoneOccupiedSlots}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Calendario del mes</h2>
        <form method="get" className="grid w-full min-w-0 gap-2 overflow-x-hidden sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="min-w-0 max-w-full overflow-hidden">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mes</label>
            <input
              type="month"
              name="month"
              defaultValue={selectedMonth}
              className="field-base min-w-0 w-full max-w-full text-sm"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</label>
            <select name="status" defaultValue={reservationStatusFilter} className="field-base min-w-0 w-full">
              <option value="">Todas las reservas</option>
              <option value="APPROVED">Solo activas</option>
              <option value="CANCELLED">Solo canceladas</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn-primary w-full sm:w-auto">
              Aplicar
            </button>
          </div>
        </form>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-800">
            Reservas ({zoneReservations.length})
          </h3>
          <div className="mt-2 grid gap-2">
            {zoneReservations.map((reservation) => (
              <article
                key={reservation.id}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{reservation.zone.name}</p>
                    <p className="text-xs text-slate-600">
                      {reservation.resident.fullName}
                      {reservation.resident.houseNumber ? ` · Casa ${reservation.resident.houseNumber}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      reservation.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {reservation.status === "APPROVED" ? "Activa" : "Cancelada"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {formatDateTimeTegucigalpa(reservation.startsAt)} — {formatDateTimeTegucigalpa(reservation.endsAt)}
                </p>
                {reservation.note ? <p className="mt-1 text-xs text-slate-500">{reservation.note}</p> : null}
                {reservation.status === "APPROVED" ? (
                  <form action={cancelZoneReservationByAdminAction} className="mt-3">
                    <input type="hidden" name="reservationId" value={reservation.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 sm:w-auto"
                    >
                      Cancelar reserva
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
            {zoneReservations.length === 0 ? (
              <p className="text-sm text-slate-600">No hay reservas en este mes o filtro.</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="text-sm font-semibold text-slate-800">Bloqueos del mes ({zoneBlocks.length})</h3>
          <div className="mt-2 grid gap-2">
            {zoneBlocks.map((block) => (
              <article key={block.id} className="rounded-xl border border-red-200 bg-red-50/60 p-3 sm:p-4">
                <p className="text-sm font-semibold text-slate-900">{block.zone.name}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatDateTimeTegucigalpa(block.startsAt)} — {formatDateTimeTegucigalpa(block.endsAt)}
                </p>
                <p className="text-xs text-slate-500">Por: {block.createdBy.fullName}</p>
                {block.reason ? <p className="mt-1 text-xs text-slate-500">{block.reason}</p> : null}
              </article>
            ))}
            {zoneBlocks.length === 0 ? (
              <p className="text-sm text-slate-600">No hay bloqueos en este mes.</p>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );

  const zonasPanel = (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Crear zona</h2>
        <p className="mb-4 text-sm text-slate-600">Define zonas comunes disponibles para reservas de residentes.</p>
        <CreateZoneForm />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Zonas configuradas ({zones.length})</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {zones.map((zone) => (
            <ZoneConfigCard key={zone.id} zone={zone} />
          ))}
          {zones.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no hay zonas creadas.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );

  const bloqueosPanel = (
    <Card>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Bloquear horario</h2>
      <p className="mb-4 text-sm text-slate-600">
        Impide reservas en un rango de fecha y hora (mantenimiento, eventos, etc.).
      </p>
      <CreateZoneBlockForm zones={zones.map((zone) => ({ id: zone.id, name: zone.name }))} />
    </Card>
  );

  return (
    <>
      <div className="surface-card border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 sm:p-6">
        <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">Zonas y reservas</h1>
        <p className="mt-1 text-sm text-slate-600">
          Administra zonas comunes, reservas de residentes y bloqueos operativos.
        </p>
      </div>

      <ZonasReservasTabs
        reservasPanel={reservasPanel}
        zonasPanel={zonasPanel}
        bloqueosPanel={bloqueosPanel}
      />
    </>
  );
}
