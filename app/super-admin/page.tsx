import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateResidentialForm } from "@/app/super-admin/create-residential-form";
import { QuotationGenerator } from "@/app/super-admin/quotation-generator";
import {
  deleteResidentialAdminAction,
  updateResidentialAdminAction,
} from "@/app/super-admin/actions";

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

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["SUPER_ADMIN"]);
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
    include: {
      users: {
        where: { role: "RESIDENTIAL_ADMIN" },
        select: { fullName: true, email: true },
      },
      _count: {
        select: { users: true, qrCodes: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const residentialAdmins = await prisma.user.findMany({
    where: { role: "RESIDENTIAL_ADMIN" },
    include: { residential: { select: { name: true } } },
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
            ...(visitorFilter
              ? { visitorName: { contains: visitorFilter, mode: "insensitive" } }
              : {}),
          },
        },
        orderBy: { scannedAt: sortFilter === "oldest" ? "asc" : "desc" },
        take: 120,
        select: {
          id: true,
          scannedAt: true,
          reason: true,
          idPhotoSize: true,
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

  return (
    <DashboardShell
      title="Super Admin"
      subtitle="Crea residenciales y asigna sus administradores."
      user={session.fullName}
    >
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nueva residencial</h2>
        <CreateResidentialForm />
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Crear cotizacion</h2>
        <p className="mb-4 text-sm text-slate-600">
          Genera una cotizacion PDF a nombre de Nexus Global para el servicio MiVisita - Seguridad
          Residencial.
        </p>
        <QuotationGenerator />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Residenciales registradas</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {residentials.map((residential) => (
            <div key={residential.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{residential.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                Admin:{" "}
                {residential.users[0]
                  ? `${residential.users[0].fullName} (${residential.users[0].email})`
                  : "Sin admin"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Usuarios: {residential._count.users} | QRs generados: {residential._count.qrCodes}
              </p>
            </div>
          ))}
          {residentials.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no hay residenciales registradas.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Admins residenciales</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {residentialAdmins.map((admin) => (
            <div key={admin.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{admin.fullName}</p>
              <p className="text-sm text-slate-600">{admin.email}</p>
              <p className="text-xs text-slate-500">
                Residencial: {admin.residential?.name ?? "Sin residencial"}
              </p>

              <div className="mt-3 grid gap-2">
                <form action={updateResidentialAdminAction} className="grid gap-2">
                  <input type="hidden" name="userId" value={admin.id} />
                  <input
                    name="fullName"
                    defaultValue={admin.fullName}
                    className="field-base"
                    placeholder="Nombre"
                    required
                  />
                  <input
                    name="email"
                    type="email"
                    defaultValue={admin.email}
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
                  <button className="btn-primary w-full">Guardar cambios</button>
                </form>
                <form action={deleteResidentialAdminAction}>
                  <input type="hidden" name="userId" value={admin.id} />
                  <button className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100">
                    Eliminar admin
                  </button>
                </form>
              </div>
            </div>
          ))}
          {residentialAdmins.length === 0 ? (
            <p className="text-sm text-slate-600">No hay admins residenciales registrados.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
            Registro global de entradas
          </summary>
          <p className="mt-2 text-sm text-slate-600">
            Seccion oculta por defecto. Debes seleccionar una residencial para consultar.
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

          {!selectedResidentialId ? (
            <p className="mt-4 text-sm text-slate-600">
              Selecciona una residencial para mostrar el registro global filtrado.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {idEvidenceScans.map((scan) => (
                <article key={scan.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  {scan.idPhotoSize ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/id-evidence/${scan.id}`}
                        alt={`ID de ${scan.code.visitorName}`}
                        className="h-44 w-full rounded-lg border border-slate-200 object-cover bg-white"
                        loading="lazy"
                      />
                    </>
                  ) : (
                    <div className="h-44 w-full rounded-lg border border-dashed border-slate-300 bg-white/60 p-4 text-xs text-slate-500">
                      Sin evidencia de ID en este registro.
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-slate-900">Visita: {scan.code.visitorName}</p>
                  <p className="text-xs text-slate-600">Residente: {scan.code.resident.fullName}</p>
                  <p className="text-xs text-slate-600">Guardia: {scan.scanner.fullName}</p>
                  <p className="text-xs text-slate-600">Residencial: {scan.code.residential.name}</p>
                  <p className="text-xs text-slate-500">
                    Fecha: {new Date(scan.scannedAt).toLocaleString("es-DO")}
                  </p>
                  <p className="text-xs text-slate-500">
                    Metodo: {scan.reason.toLowerCase().includes("manual") ? "Manual" : "QR"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Evidencia: {scan.idPhotoSize ? "Si" : "No"} {scan.idPhotoSize ? `(${scan.idPhotoSize} bytes)` : ""}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{scan.reason}</p>
                </article>
              ))}
              {idEvidenceScans.length === 0 ? (
                <p className="text-sm text-slate-600">No hay entradas para los filtros seleccionados.</p>
              ) : null}
            </div>
          )}
        </details>
      </Card>
    </DashboardShell>
  );
}
