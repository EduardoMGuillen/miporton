import { Card } from "@/app/components/shell";
import { EntryRecordExportButton } from "@/app/components/entry-record-export-button";
import { EntryEvidencePreview } from "@/app/components/entry-evidence-preview";
import { MonthlyAccessReportButton } from "@/app/components/monthly-access-report-button";
import { requireRole } from "@/lib/authorization";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
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

export default async function SuperAdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole(["SUPER_ADMIN"]);
  const params = await searchParams;

  const selectedResidentialId = getSingleParam(params.logResidentialId).trim();
  const selectedMonth = normalizeMonth(getSingleParam(params.logMonth) || defaultMonthValue());
  const visitorFilter = getSingleParam(params.logVisitor).trim();
  const residentFilter = getSingleParam(params.logResidentId).trim();
  const guardFilter = getSingleParam(params.logGuardId).trim();
  const methodFilter = getSingleParam(params.logMethod).trim();
  const evidenceFilter = getSingleParam(params.logEvidence).trim();
  const sortFilter = getSingleParam(params.logSort).trim();
  const { start: monthStart, end: monthEnd } = monthRange(selectedMonth);

  const residentials = await prisma.residential.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const [residentsForFilter, guardsForFilter] = selectedResidentialId
    ? await Promise.all([
        prisma.user.findMany({
          where: { residentialId: selectedResidentialId, role: "RESIDENT" },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        }),
        prisma.user.findMany({
          where: { residentialId: selectedResidentialId, role: "GUARD" },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        }),
      ])
    : [[], []];

  const idEvidenceScans = selectedResidentialId
    ? await prisma.qrScan.findMany({
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
            residentialId: selectedResidentialId,
            ...(residentFilter ? { residentId: residentFilter } : {}),
            ...(visitorFilter ? { visitorName: { contains: visitorFilter, mode: "insensitive" } } : {}),
          },
        },
        orderBy: { scannedAt: sortFilter === "oldest" ? "asc" : "desc" },
        take: 120,
        select: {
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
              resident: { select: { fullName: true } },
              residential: { select: { name: true } },
            },
          },
        },
      })
    : [];

  const deliveryEntries = selectedResidentialId
    ? await prisma.deliveryAnnouncement.findMany({
        where: {
          residentialId: selectedResidentialId,
          createdAt: { gte: monthStart, lt: monthEnd },
          ...(residentFilter ? { residentId: residentFilter } : {}),
          ...(guardFilter ? { guardId: guardFilter } : {}),
          ...(visitorFilter ? { note: { contains: visitorFilter, mode: "insensitive" } } : {}),
        },
        orderBy: { createdAt: sortFilter === "oldest" ? "asc" : "desc" },
        select: {
          id: true,
          note: true,
          createdAt: true,
          resident: { select: { fullName: true } },
          guard: { select: { fullName: true } },
          residential: { select: { name: true } },
        },
        take: 120,
      })
    : [];

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Registro global y reportes</h2>
      <p className="mt-2 text-sm text-slate-600">
        Filtra por residencial y periodo para exportar registros o generar reporte mensual.
      </p>

      <form className="mt-4 grid gap-2 md:grid-cols-3">
        <select name="logResidentialId" defaultValue={selectedResidentialId} className="field-base" required>
          <option value="">Selecciona una residencial</option>
          {residentials.map((residential) => (
            <option key={residential.id} value={residential.id}>
              {residential.name}
            </option>
          ))}
        </select>
        <input type="month" name="logMonth" defaultValue={selectedMonth} className="field-base" />
        <input
          name="logVisitor"
          defaultValue={visitorFilter}
          className="field-base"
          placeholder="Filtrar por visita"
        />
        <select name="logResidentId" defaultValue={residentFilter} className="field-base">
          <option value="">Todos los residentes</option>
          {residentsForFilter.map((resident) => (
            <option key={resident.id} value={resident.id}>
              {resident.fullName}
            </option>
          ))}
        </select>
        <select name="logGuardId" defaultValue={guardFilter} className="field-base">
          <option value="">Todos los guardias</option>
          {guardsForFilter.map((guard) => (
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
        <div className="md:col-span-2" />
        <button className="btn-primary w-full">Aplicar filtros</button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
          Entradas registradas: {idEvidenceScans.length}
        </div>
        <div className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          Delivery registrados: {deliveryEntries.length}
        </div>
      </div>

      {selectedResidentialId ? (
        <div className="mt-3">
          <MonthlyAccessReportButton
            reportTitle="Reporte global mensual de accesos"
            monthLabel={selectedMonth}
            entries={idEvidenceScans.map((scan) => ({
              recordId: scan.id,
              entryDateLabel: formatDateTimeTegucigalpa(scan.scannedAt),
              exitDateLabel: scan.exitedAt ? formatDateTimeTegucigalpa(scan.exitedAt) : "Pendiente",
              exitStatusLabel: scan.exitedAt ? "Completada" : "Pendiente",
              exitNote: scan.exitNote ?? undefined,
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
      ) : null}

      {!selectedResidentialId ? (
        <p className="mt-4 text-sm text-slate-600">
          Selecciona una residencial para mostrar el registro global filtrado.
        </p>
      ) : (
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
              <p className="text-xs text-slate-600">Residencial: {scan.code.residential.name}</p>
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
                Placa: {scan.platePhotoSize ? "Si" : "No"} {scan.platePhotoSize ? `(${scan.platePhotoSize} bytes)` : ""}
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
                residentName={scan.code.resident.fullName}
                guardName={scan.scanner.fullName}
                residentialName={scan.code.residential.name}
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

          {(methodFilter === "delivery" ? deliveryEntries : []).map((delivery) => (
            <article key={delivery.id} className="rounded-xl border border-slate-200 bg-amber-50/70 p-4">
              <div className="h-44 w-full rounded-lg border border-dashed border-amber-300 bg-white/60 p-4 text-xs text-slate-500">
                Registro de delivery (sin imagen).
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">Delivery anunciado</p>
              <p className="text-xs text-slate-600">Residente: {delivery.resident.fullName}</p>
              <p className="text-xs text-slate-600">Guardia: {delivery.guard.fullName}</p>
              <p className="text-xs text-slate-600">Residencial: {delivery.residential.name}</p>
              <p className="text-xs text-slate-500">Fecha: {formatDateTimeTegucigalpa(delivery.createdAt)}</p>
              <p className="mt-2 text-xs text-slate-500">{delivery.note}</p>
            </article>
          ))}
          {idEvidenceScans.length === 0 && deliveryEntries.length === 0 ? (
            <p className="text-sm text-slate-600">No hay entradas para los filtros seleccionados.</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
