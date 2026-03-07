import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateResidentialUserForm } from "@/app/residential-admin/create-user-form";
import { EntryRecordExportButton } from "@/app/components/entry-record-export-button";
import { EntryEvidencePreview } from "@/app/components/entry-evidence-preview";
import { MonthlyAccessReportButton } from "@/app/components/monthly-access-report-button";
import { CreateZoneForm } from "@/app/residential-admin/create-zone-form";
import { CreateZoneBlockForm } from "@/app/residential-admin/create-zone-block-form";
import { CreateAnnouncementForm } from "@/app/residential-admin/create-announcement-form";
import { CreateAdminQrForm } from "@/app/residential-admin/create-admin-qr-form";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import {
  cancelZoneReservationByAdminAction,
  deleteResidentialUserAction,
  updateResidentialUserAction,
} from "@/app/residential-admin/actions";

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

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

export default async function ResidentialAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const params = await searchParams;
  const selectedMonth = normalizeMonth(getSingleParam(params.logMonth) || defaultMonthValue());
  const visitorFilter = getSingleParam(params.logVisitor).trim();
  const residentFilter = getSingleParam(params.logResidentId).trim();
  const guardFilter = getSingleParam(params.logGuardId).trim();
  const methodFilter = getSingleParam(params.logMethod).trim();
  const evidenceFilter = getSingleParam(params.logEvidence).trim();
  const sortFilter = getSingleParam(params.logSort).trim();
  const reservationStatusFilter = getSingleParam(params.reservationStatus).trim();
  const hasLogQuery = Object.keys(params).some((key) => key.startsWith("log"));
  const { start: monthStart, end: monthEnd } = monthRange(selectedMonth);

  const [residential, users] = await Promise.all([
    prisma.residential.findUnique({
      where: { id: session.residentialId },
      select: { name: true },
    }),
    prisma.user.findMany({
      where: {
        residentialId: session.residentialId,
        role: { in: ["RESIDENT", "GUARD"] },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const residents = users.filter((user) => user.role === "RESIDENT");
  const guards = users.filter((user) => user.role === "GUARD");
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
  const recentAnnouncements = await prisma.adminAnnouncement.findMany({
    where: { residentialId: session.residentialId },
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const idEvidenceScans = await prisma.qrScan.findMany({
    where: {
      isValid: true,
      scannedAt: { gte: monthStart, lt: monthEnd },
      ...(guardFilter ? { scannerId: guardFilter } : {}),
      ...(methodFilter === "manual"
        ? { reason: { contains: "manual", mode: "insensitive" } }
        : methodFilter === "qr"
          ? { NOT: { reason: { contains: "manual", mode: "insensitive" } } }
          : {}),
      ...(evidenceFilter === "with"
        ? { idPhotoData: { not: null } }
        : evidenceFilter === "without"
          ? { idPhotoData: null }
          : {}),
      code: {
        residentialId: session.residentialId,
        ...(residentFilter ? { residentId: residentFilter } : {}),
        ...(visitorFilter
          ? { visitorName: { contains: visitorFilter, mode: "insensitive" } }
          : {}),
      },
    },
    orderBy: { scannedAt: sortFilter === "oldest" ? "asc" : "desc" },
    take: 80,
    select: {
      id: true,
      scannedAt: true,
      reason: true,
      idPhotoSize: true,
      platePhotoSize: true,
      scanner: { select: { fullName: true } },
      code: {
        select: {
          visitorName: true,
          resident: { select: { fullName: true } },
        },
      },
    },
  });
  const deliveryEntries = await prisma.deliveryAnnouncement.findMany({
    where: {
      residentialId: session.residentialId,
      createdAt: { gte: monthStart, lt: monthEnd },
      ...(residentFilter ? { residentId: residentFilter } : {}),
      ...(guardFilter ? { guardId: guardFilter } : {}),
      ...(visitorFilter ? { note: { contains: visitorFilter, mode: "insensitive" } } : {}),
    },
    select: {
      id: true,
      note: true,
      createdAt: true,
      resident: { select: { fullName: true } },
      guard: { select: { fullName: true } },
    },
    orderBy: { createdAt: sortFilter === "oldest" ? "asc" : "desc" },
    take: 80,
  });

  return (
    <DashboardShell
      title="Admin de Residencial"
      subtitle={`Gestion de usuarios para ${residential?.name ?? "tu residencial"}.`}
      user={session.fullName}
    >
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Crear usuarios</h2>
        <CreateResidentialUserForm />
      </Card>

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
                Maximo por reserva: {zone.maxHoursPerReservation} hora(s) | Estado: {zone.isActive ? "Activa" : "Inactiva"}
              </p>
              {zone.description ? <p className="text-xs text-slate-500">{zone.description}</p> : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Comunicados a residentes</h2>
        <CreateAnnouncementForm residents={residents.map((r) => ({ id: r.id, fullName: r.fullName }))} />
        <div className="mt-4 grid gap-2">
          {recentAnnouncements.map((announcement) => (
            <div key={announcement.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
              <p className="text-xs text-slate-600">
                Enviado: {formatDateTimeTegucigalpa(announcement.createdAt)} | Destinatarios:{" "}
                {announcement._count.recipients}
              </p>
              <p className="text-xs text-slate-500">{announcement.message}</p>
            </div>
          ))}
          {recentAnnouncements.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no se han enviado comunicados.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Generar QR como administracion</h2>
        <CreateAdminQrForm residents={residents.map((r) => ({ id: r.id, fullName: r.fullName }))} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Usuarios de la residencial</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-sm text-slate-600">
                {user.email} - {user.role === "RESIDENT" ? "Residente" : "Guardia"}
              </p>
              <p className="text-xs text-slate-500">Vivienda: {user.houseNumber || "Sin definir"}</p>
              <div className="mt-3 grid gap-2">
                <form action={updateResidentialUserAction} className="grid gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <input
                    name="fullName"
                    defaultValue={user.fullName}
                    className="field-base"
                    placeholder="Nombre"
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    defaultValue={user.email}
                    className="field-base"
                    placeholder="Correo"
                    required
                  />
                  <input
                    name="password"
                    type="password"
                    className="field-base"
                    placeholder="Nueva password (opcional)"
                  />
                  <input
                    name="houseNumber"
                    defaultValue={user.houseNumber ?? ""}
                    className="field-base"
                    placeholder="Numero de vivienda"
                  />
                  <button className="btn-primary w-full">Guardar cambios</button>
                </form>
                <form action={deleteResidentialUserAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <button className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100">
                    Eliminar usuario
                  </button>
                </form>
              </div>
            </div>
          ))}
          {users.length === 0 ? (
            <p className="text-sm text-slate-600">No hay usuarios creados todavia.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <details open={hasLogQuery}>
          <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
            Registro de entradas (por mes)
          </summary>
          <p className="mt-2 text-sm text-slate-600">
            Seccion oculta por defecto. Solo muestra entradas del mes seleccionado.
          </p>

          <form className="mt-4 grid gap-2 md:grid-cols-3">
            <input type="month" name="logMonth" defaultValue={selectedMonth} className="field-base" />
            <input
              name="logVisitor"
              defaultValue={visitorFilter}
              className="field-base"
              placeholder="Filtrar por visita"
            />
            <select name="logResidentId" defaultValue={residentFilter} className="field-base">
              <option value="">Todos los residentes</option>
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.fullName}
                </option>
              ))}
            </select>
            <select name="logGuardId" defaultValue={guardFilter} className="field-base">
              <option value="">Todos los guardias</option>
              {guards.map((guard) => (
                <option key={guard.id} value={guard.id}>
                  {guard.fullName}
                </option>
              ))}
            </select>
            <select name="logMethod" defaultValue={methodFilter} className="field-base">
              <option value="">Metodo: todos</option>
              <option value="qr">QR escaneado</option>
              <option value="manual">Registro manual</option>
              <option value="delivery">Delivery</option>
            </select>
            <select name="logEvidence" defaultValue={evidenceFilter} className="field-base">
              <option value="">Evidencia: todas</option>
              <option value="with">Con evidencia ID</option>
              <option value="without">Sin evidencia ID</option>
            </select>
            <select name="logSort" defaultValue={sortFilter || "newest"} className="field-base">
              <option value="newest">Mas recientes</option>
              <option value="oldest">Mas antiguas</option>
            </select>
            <select name="reservationStatus" defaultValue={reservationStatusFilter} className="field-base">
              <option value="">Reservas: todas</option>
              <option value="APPROVED">Solo activas</option>
              <option value="CANCELLED">Solo canceladas</option>
            </select>
            <button className="btn-primary w-full md:col-span-2">Aplicar filtros</button>
          </form>
          <div className="mt-3">
            <MonthlyAccessReportButton
              reportTitle={`Reporte mensual - ${residential?.name ?? "Residencial"}`}
              monthLabel={selectedMonth}
              entries={idEvidenceScans.map((scan) => ({
                dateLabel: formatDateTimeTegucigalpa(scan.scannedAt),
                visitorName: scan.code.visitorName,
                residentName: scan.code.resident.fullName,
                guardName: scan.scanner.fullName,
                method: scan.reason.toLowerCase().includes("manual") ? "Manual" : "QR",
                reason: scan.reason,
              }))}
              deliveries={deliveryEntries.map((delivery) => ({
                dateLabel: formatDateTimeTegucigalpa(delivery.createdAt),
                residentName: delivery.resident.fullName,
                guardName: delivery.guard.fullName,
                note: delivery.note,
              }))}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {(methodFilter === "delivery" ? [] : idEvidenceScans).map((scan) => (
              <article key={scan.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                {scan.idPhotoSize ? (
                  <EntryEvidencePreview
                    imageUrl={`/api/id-evidence/${scan.id}`}
                    alt={`ID de ${scan.code.visitorName}`}
                  />
                ) : (
                  <div className="h-44 w-full rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-500">
                    Sin evidencia de ID en este registro.
                  </div>
                )}
                <p className="mt-3 text-sm font-semibold text-slate-900">Visita: {scan.code.visitorName}</p>
                <p className="text-xs text-slate-600">Residente: {scan.code.resident.fullName}</p>
                <p className="text-xs text-slate-600">Guardia: {scan.scanner.fullName}</p>
                <p className="text-xs text-slate-500">
                  Fecha: {formatDateTimeTegucigalpa(scan.scannedAt)}
                </p>
                <p className="text-xs text-slate-500">
                  Metodo: {scan.reason.toLowerCase().includes("manual") ? "Manual" : "QR"}
                </p>
                <p className="text-xs text-slate-500">
                  Evidencia: {scan.idPhotoSize ? "Si" : "No"} {scan.idPhotoSize ? `(${scan.idPhotoSize} bytes)` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  Placa: {scan.platePhotoSize ? "Si" : "No"}{" "}
                  {scan.platePhotoSize ? `(${scan.platePhotoSize} bytes)` : ""}
                </p>
                {scan.platePhotoSize ? (
                  <div className="mt-2">
                    <EntryEvidencePreview
                      imageUrl={`/api/plate-evidence/${scan.id}`}
                      alt={`Placa de ${scan.code.visitorName}`}
                    />
                  </div>
                ) : null}
                <p className="mt-2 text-xs text-slate-500">{scan.reason}</p>
                <EntryRecordExportButton
                  recordId={scan.id}
                  visitorName={scan.code.visitorName}
                  residentName={scan.code.resident.fullName}
                  guardName={scan.scanner.fullName}
                  scannedAtLabel={formatDateTimeTegucigalpa(scan.scannedAt)}
                  methodLabel={scan.reason.toLowerCase().includes("manual") ? "Manual" : "QR"}
                  evidenceLabel={scan.idPhotoSize || scan.platePhotoSize ? "Con evidencia" : "Sin evidencia"}
                  reason={scan.reason}
                  evidenceImageUrl={scan.idPhotoSize ? `/api/id-evidence/${scan.id}` : undefined}
                  plateImageUrl={scan.platePhotoSize ? `/api/plate-evidence/${scan.id}` : undefined}
                />
              </article>
            ))}
            {(methodFilter === "delivery" ? deliveryEntries : []).map((delivery) => (
              <article key={delivery.id} className="rounded-xl border border-slate-200 bg-amber-50/70 p-4">
                <div className="h-44 w-full rounded-lg border border-dashed border-amber-300 bg-white/60 p-4 text-xs text-slate-500">
                  Registro de delivery (sin imagen).
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900">Delivery anunciado</p>
                <p className="text-xs text-slate-600">Residente: {delivery.resident.fullName}</p>
                <p className="text-xs text-slate-600">Guardia: {delivery.guard.fullName}</p>
                <p className="text-xs text-slate-500">Fecha: {formatDateTimeTegucigalpa(delivery.createdAt)}</p>
                <p className="mt-2 text-xs text-slate-500">{delivery.note}</p>
              </article>
            ))}
            {idEvidenceScans.length === 0 && deliveryEntries.length === 0 ? (
              <p className="text-sm text-slate-600">No hay entradas para los filtros seleccionados.</p>
            ) : null}
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Calendario de reservas del mes</h3>
            <div className="mt-2 grid gap-2">
              {zoneReservations.map((reservation) => (
                <div key={reservation.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {reservation.zone.name} - {reservation.resident.fullName}
                  </p>
                  <p className="text-xs text-slate-600">
                    {formatDateTimeTegucigalpa(reservation.startsAt)} - {formatDateTimeTegucigalpa(reservation.endsAt)}
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

          <div className="mt-4">
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
        </details>
      </Card>
    </DashboardShell>
  );
}
