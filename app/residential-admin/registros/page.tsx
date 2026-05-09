import { Card } from "@/app/components/shell";
import { EntryRecordExportButton } from "@/app/components/entry-record-export-button";
import { EntryEvidencePreview } from "@/app/components/entry-evidence-preview";
import { MonthlyAccessReportButton } from "@/app/components/monthly-access-report-button";
import { RegistroLogsPagination } from "@/app/components/registro-logs-pagination";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { parseEvidenceFilterMode } from "@/lib/registro-evidence-filter";
import {
  REGISTRO_PAGE_SIZE,
  buildRegistroDeliveryWhere,
  buildRegistroQrScanWhere,
  parseRegistroPage,
} from "@/lib/registro-logs-query";

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

const scanSelectResidential = {
  id: true,
  scannedAt: true,
  exitedAt: true,
  exitNote: true,
  reason: true,
  idPhotoSize: true,
  platePhotoSize: true,
  scanner: { select: { fullName: true } },
  code: {
    select: {
      visitorName: true,
      description: true,
      resident: { select: { fullName: true } },
    },
  },
} as const;

const deliverySelectResidential = {
  id: true,
  note: true,
  createdAt: true,
  resident: { select: { fullName: true } },
  guard: { select: { fullName: true } },
} as const;

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
  const evidenceMode = parseEvidenceFilterMode(getSingleParam(params.logEvidence));
  const sortFilter = getSingleParam(params.logSort).trim();
  const rawPage = parseRegistroPage(getSingleParam(params.logPage));
  const { start: monthStart, end: monthEnd } = monthRange(selectedMonth);

  const scanFilterArgs = {
    monthStart,
    monthEnd,
    residentialId: session.residentialId,
    visitorFilter,
    residentFilter,
    guardFilter,
    methodFilter,
    evidenceMode,
  };
  const deliveryFilterArgs = {
    monthStart,
    monthEnd,
    residentialId: session.residentialId,
    visitorFilter,
    residentFilter,
    guardFilter,
  };

  const scanWhere = buildRegistroQrScanWhere(scanFilterArgs);
  const deliveryWhere = buildRegistroDeliveryWhere(deliveryFilterArgs);
  const orderScan = { scannedAt: sortFilter === "oldest" ? ("asc" as const) : ("desc" as const) };
  const orderDelivery = { createdAt: sortFilter === "oldest" ? ("asc" as const) : ("desc" as const) };

  const users = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: { in: ["RESIDENT", "GUARD"] },
    },
    orderBy: { fullName: "asc" },
  });
  const residents = users.filter((user) => user.role === "RESIDENT");
  const guards = users.filter((user) => user.role === "GUARD");

  const [residential, totalScans, totalDeliveries, scansForReport, deliveriesForReport] = await Promise.all([
    prisma.residential.findUnique({
      where: { id: session.residentialId },
      select: { name: true },
    }),
    prisma.qrScan.count({ where: scanWhere }),
    prisma.deliveryAnnouncement.count({ where: deliveryWhere }),
    prisma.qrScan.findMany({
      where: scanWhere,
      orderBy: orderScan,
      select: scanSelectResidential,
    }),
    prisma.deliveryAnnouncement.findMany({
      where: deliveryWhere,
      orderBy: orderDelivery,
      select: deliverySelectResidential,
    }),
  ]);

  const scanTotalPages = Math.max(1, Math.ceil(totalScans / REGISTRO_PAGE_SIZE));
  const deliveryTotalPages = Math.max(1, Math.ceil(totalDeliveries / REGISTRO_PAGE_SIZE));
  const pageForScans = methodFilter === "delivery" ? 1 : Math.min(rawPage, scanTotalPages);
  const pageForDeliveries = methodFilter === "delivery" ? Math.min(rawPage, deliveryTotalPages) : 1;

  const scansPage =
    methodFilter === "delivery"
      ? []
      : await prisma.qrScan.findMany({
          where: scanWhere,
          orderBy: orderScan,
          skip: (pageForScans - 1) * REGISTRO_PAGE_SIZE,
          take: REGISTRO_PAGE_SIZE,
          select: scanSelectResidential,
        });

  const deliveriesPage =
    methodFilter === "delivery"
      ? await prisma.deliveryAnnouncement.findMany({
          where: deliveryWhere,
          orderBy: orderDelivery,
          skip: (pageForDeliveries - 1) * REGISTRO_PAGE_SIZE,
          take: REGISTRO_PAGE_SIZE,
          select: deliverySelectResidential,
        })
      : [];

  const paginationBaseParams: Record<string, string> = {
    logMonth: selectedMonth,
    logVisitor: visitorFilter,
    logResidentId: residentFilter,
    logGuardId: guardFilter,
    logMethod: methodFilter,
    logEvidence: evidenceMode,
    logSort: sortFilter || "newest",
  };

  const activeTotal = methodFilter === "delivery" ? totalDeliveries : totalScans;
  const activePage = methodFilter === "delivery" ? pageForDeliveries : pageForScans;

  const listScans = methodFilter === "delivery" ? [] : scansPage;
  const listDeliveries = methodFilter === "delivery" ? deliveriesPage : [];

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Registro de entradas y reportes</h2>
      <p className="mt-2 text-sm text-slate-600">
        Filtros por mes/metodo con exportes PDF de registros y reporte mensual consolidado.{" "}
        <span className="text-slate-500">
          Evidencia &quot;Todas&quot; incluye entradas manuales, con foto y con evidencia ya purgada (sin imagen).
        </span>
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
        <select name="logEvidence" defaultValue={evidenceMode} className="field-base">
          <option value="all">Evidencia: todas</option>
          <option value="with">Con evidencia ID</option>
          <option value="without">Sin evidencia ID</option>
        </select>
        <select name="logSort" defaultValue={sortFilter || "newest"} className="field-base">
          <option value="newest">Mas recientes</option>
          <option value="oldest">Mas antiguas</option>
        </select>
        <button className="btn-primary w-full md:col-span-2">Aplicar filtros</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          Entradas (QR/manual): {totalScans} total
          {methodFilter !== "delivery" && totalScans > 0 ? (
            <span className="ml-1 font-normal text-slate-500">
              · lista paginada: {REGISTRO_PAGE_SIZE} por pagina
            </span>
          ) : null}
        </div>
        <div className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Delivery: {totalDeliveries} total
          {methodFilter === "delivery" && totalDeliveries > 0 ? (
            <span className="ml-1 font-normal text-amber-700">
              · lista paginada: {REGISTRO_PAGE_SIZE} por pagina
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <MonthlyAccessReportButton
          reportTitle={`Reporte mensual - ${residential?.name ?? "Residencial"}`}
          monthLabel={selectedMonth}
          entries={scansForReport.map((scan) => ({
            recordId: scan.id,
            entryDateLabel: formatDateTimeTegucigalpa(scan.scannedAt),
            exitDateLabel: scan.exitedAt ? formatDateTimeTegucigalpa(scan.exitedAt) : "Pendiente",
            exitStatusLabel: scan.exitedAt ? "Completada" : "Pendiente",
            exitNote: scan.exitNote ?? undefined,
            visitorName: scan.code.visitorName,
            visitorDescription: scan.code.description,
            residentName: scan.code.resident.fullName,
            guardName: scan.scanner.fullName,
            method: scan.reason.toLowerCase().includes("manual") ? "Manual" : "QR",
            reason: scan.reason,
            evidenceImageUrl: scan.idPhotoSize ? `/api/id-evidence/${scan.id}` : undefined,
            plateImageUrl: scan.platePhotoSize ? `/api/plate-evidence/${scan.id}` : undefined,
          }))}
          deliveries={deliveriesForReport.map((delivery) => ({
            dateLabel: formatDateTimeTegucigalpa(delivery.createdAt),
            residentName: delivery.resident.fullName,
            guardName: delivery.guard.fullName,
            note: delivery.note,
          }))}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {listScans.map((scan) => (
          <article key={scan.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            {scan.idPhotoSize ? (
              <EntryEvidencePreview imageUrl={`/api/id-evidence/${scan.id}`} alt={`ID de ${scan.code.visitorName}`} />
            ) : (
              <div className="h-44 w-full rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-500">
                Sin evidencia de ID en este registro.
              </div>
            )}
            <p className="mt-3 text-sm font-semibold text-slate-900">Visita: {scan.code.visitorName}</p>
            {scan.code.description?.trim() ? (
              <p className="mt-1 text-xs text-slate-700">Descripcion del QR: {scan.code.description}</p>
            ) : null}
            <p className="text-xs text-slate-600">Residente: {scan.code.resident.fullName}</p>
            <p className="text-xs text-slate-600">Guardia: {scan.scanner.fullName}</p>
            <p className="text-xs text-slate-500">Entrada: {formatDateTimeTegucigalpa(scan.scannedAt)}</p>
            <p className="text-xs text-slate-500">
              Salida: {scan.exitedAt ? formatDateTimeTegucigalpa(scan.exitedAt) : "Pendiente"}
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
            {scan.exitNote ? <p className="text-xs text-slate-500">Nota salida: {scan.exitNote}</p> : null}
            <EntryRecordExportButton
              recordId={scan.id}
              visitorName={scan.code.visitorName}
              visitorDescription={scan.code.description ?? undefined}
              residentName={scan.code.resident.fullName}
              guardName={scan.scanner.fullName}
              entryAtLabel={formatDateTimeTegucigalpa(scan.scannedAt)}
              exitAtLabel={scan.exitedAt ? formatDateTimeTegucigalpa(scan.exitedAt) : "Pendiente"}
              exitStatusLabel={scan.exitedAt ? "Completada" : "Pendiente"}
              exitNote={scan.exitNote ?? undefined}
              methodLabel={scan.reason.toLowerCase().includes("manual") ? "Manual" : "QR"}
              evidenceLabel={scan.idPhotoSize || scan.platePhotoSize ? "Con evidencia" : "Sin evidencia"}
              reason={scan.reason}
              evidenceImageUrl={scan.idPhotoSize ? `/api/id-evidence/${scan.id}` : undefined}
              plateImageUrl={scan.platePhotoSize ? `/api/plate-evidence/${scan.id}` : undefined}
            />
          </article>
        ))}
        {listDeliveries.map((delivery) => (
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
        {listScans.length === 0 && listDeliveries.length === 0 ? (
          <p className="text-sm text-slate-600">No hay entradas para los filtros seleccionados.</p>
        ) : null}
      </div>

      <RegistroLogsPagination
        basePath="/residential-admin/registros"
        params={paginationBaseParams}
        page={activePage}
        totalItems={activeTotal}
        pageSize={REGISTRO_PAGE_SIZE}
      />
    </Card>
  );
}
