import { Card } from "@/app/components/shell";
import { EntryRecordExportButton } from "@/app/components/entry-record-export-button";
import { EntryEvidencePreview } from "@/app/components/entry-evidence-preview";
import { MonthlyAccessReportButton } from "@/app/components/monthly-access-report-button";
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

export default async function ResidentialAdminLogsPage({
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
  const { start: monthStart, end: monthEnd } = monthRange(selectedMonth);

  const users = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: { in: ["RESIDENT", "GUARD"] },
    },
    orderBy: { fullName: "asc" },
  });
  const residents = users.filter((user) => user.role === "RESIDENT");
  const guards = users.filter((user) => user.role === "GUARD");

  const [residential, idEvidenceScans, deliveryEntries] = await Promise.all([
    prisma.residential.findUnique({
      where: { id: session.residentialId },
      select: { name: true },
    }),
    prisma.qrScan.findMany({
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
          ...(visitorFilter ? { visitorName: { contains: visitorFilter, mode: "insensitive" } } : {}),
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
    }),
    prisma.deliveryAnnouncement.findMany({
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
    }),
  ]);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Registro de entradas y reportes</h2>
      <p className="mt-2 text-sm text-slate-600">
        Filtros por mes/metodo con exportes PDF de registros y reporte mensual consolidado.
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
        <button className="btn-primary w-full md:col-span-2">Aplicar filtros</button>
      </form>

      <div className="mt-3">
        <MonthlyAccessReportButton
          reportTitle={`Reporte mensual - ${residential?.name ?? "Residencial"}`}
          monthLabel={selectedMonth}
          entries={idEvidenceScans.map((scan) => ({
            recordId: scan.id,
            dateLabel: formatDateTimeTegucigalpa(scan.scannedAt),
            visitorName: scan.code.visitorName,
            residentName: scan.code.resident.fullName,
            guardName: scan.scanner.fullName,
            method: scan.reason.toLowerCase().includes("manual") ? "Manual" : "QR",
            reason: scan.reason,
            evidenceImageUrl: scan.idPhotoSize ? `/api/id-evidence/${scan.id}` : undefined,
            plateImageUrl: scan.platePhotoSize ? `/api/plate-evidence/${scan.id}` : undefined,
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
              <EntryEvidencePreview imageUrl={`/api/id-evidence/${scan.id}`} alt={`ID de ${scan.code.visitorName}`} />
            ) : (
              <div className="h-44 w-full rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-500">
                Sin evidencia de ID en este registro.
              </div>
            )}
            <p className="mt-3 text-sm font-semibold text-slate-900">Visita: {scan.code.visitorName}</p>
            <p className="text-xs text-slate-600">Residente: {scan.code.resident.fullName}</p>
            <p className="text-xs text-slate-600">Guardia: {scan.scanner.fullName}</p>
            <p className="text-xs text-slate-500">Fecha: {formatDateTimeTegucigalpa(scan.scannedAt)}</p>
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
    </Card>
  );
}
