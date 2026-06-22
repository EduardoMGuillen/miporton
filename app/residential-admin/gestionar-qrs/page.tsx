import { Card } from "@/app/components/shell";
import { revokeResidentQrAction } from "@/app/residential-admin/actions";
import { RevokeQrButton } from "@/app/residential-admin/revoke-admin-qr-button";
import { requireRole } from "@/lib/authorization";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

function validityLabel(validityType: "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS" | "INFINITE") {
  if (validityType === "SINGLE_USE") return "1 solo uso";
  if (validityType === "ONE_DAY") return "Valido por 1 dia";
  if (validityType === "INFINITE") return "Sin vencimiento";
  return "Valido por 3 dias";
}

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function GestionarQrsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const params = await searchParams;
  const residentFilter = getSingleParam(params.residentId).trim();

  const residents = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: "RESIDENT",
    },
    select: { id: true, fullName: true, houseNumber: true },
    orderBy: { fullName: "asc" },
  });

  const now = new Date();
  const baseWhere = {
    residentialId: session.residentialId,
    resident: { role: "RESIDENT" as const },
    ...(residentFilter ? { residentId: residentFilter } : {}),
  };

  const residentInclude = {
    resident: {
      select: { fullName: true, houseNumber: true },
    },
  } as const;

  // Mismo criterio que /resident: ordenar por validUntil asc + take(N) dejaba fuera los activos recientes.
  const [futureDated, expiredByDate] = await Promise.all([
    prisma.qrCode.findMany({
      where: { ...baseWhere, validUntil: { gte: now } },
      include: residentInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.qrCode.findMany({
      where: { ...baseWhere, validUntil: { lt: now } },
      include: residentInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const activeQrCodes = futureDated.filter((qr) => !qr.isRevoked && qr.usedCount < qr.maxUses);
  const inactiveFromFuture = futureDated.filter((qr) => qr.isRevoked || qr.usedCount >= qr.maxUses);
  const inactiveById = new Map<string, (typeof futureDated)[number]>();
  for (const row of [...inactiveFromFuture, ...expiredByDate]) {
    inactiveById.set(row.id, row);
  }
  const inactiveQrCodes = Array.from(inactiveById.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return (
    <>
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Gestionar QRs de residentes</h2>
        <p className="mb-4 text-sm text-slate-600">
          Revisa y desactiva invitaciones QR creadas por residentes. Al desactivar un QR, deja de funcionar de
          inmediato en porteria pero se conserva el historial de accesos.
        </p>

        <form method="get" className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="residentId" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Residente
            </label>
            <select id="residentId" name="residentId" defaultValue={residentFilter} className="field-base w-full">
              <option value="">Todos los residentes</option>
              {residents.map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.fullName}
                  {resident.houseNumber ? ` (${resident.houseNumber})` : ""}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">QRs activos ({activeQrCodes.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {activeQrCodes.map((qr) => (
            <article key={qr.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-900">{qr.visitorName}</p>
              <p className="text-xs text-slate-600">
                Residente: {qr.resident.fullName}
                {qr.resident.houseNumber ? ` · Vivienda ${qr.resident.houseNumber}` : ""}
              </p>
              <p className="text-xs text-slate-600">{validityLabel(qr.validityType)}</p>
              {qr.description ? <p className="text-xs text-slate-500">Descripcion: {qr.description}</p> : null}
              <p className="text-xs text-slate-500">
                Tipo de acceso: {qr.hasVehicle ? "Vehiculo" : "Acceso peatonal"}
              </p>
              <p className="text-xs text-slate-500">Creado: {formatDateTimeTegucigalpa(qr.createdAt)}</p>
              <p className="text-xs text-slate-500">Expira: {formatDateTimeTegucigalpa(qr.validUntil)}</p>
              <p className="text-xs text-slate-500">
                Usos: {qr.usedCount}/{qr.maxUses === 9999 || qr.maxUses === 2147483647 ? "Ilimitado" : qr.maxUses}
              </p>
              <RevokeQrButton
                qrId={qr.id}
                action={revokeResidentQrAction}
                label="Desactivar QR"
                confirmMessage="¿Seguro que deseas desactivar este QR del residente? Dejara de funcionar inmediatamente."
              />
            </article>
          ))}
          {activeQrCodes.length === 0 ? (
            <p className="text-sm text-slate-600">No hay QRs activos de residentes.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
            QRs inactivos ({inactiveQrCodes.length})
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {inactiveQrCodes.map((qr) => (
              <article key={qr.id} className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 opacity-90">
                <p className="text-sm font-semibold text-slate-900">{qr.visitorName}</p>
                <p className="text-xs text-slate-600">
                  Residente: {qr.resident.fullName}
                  {qr.resident.houseNumber ? ` · Vivienda ${qr.resident.houseNumber}` : ""}
                </p>
                <p className="text-xs text-slate-600">{validityLabel(qr.validityType)}</p>
                {qr.description ? <p className="text-xs text-slate-500">Descripcion: {qr.description}</p> : null}
                <p className="text-xs text-slate-500">
                  Estado:{" "}
                  {qr.isRevoked ? "Desactivado" : qr.usedCount >= qr.maxUses ? "Usos agotados" : "Expirado"}
                </p>
                <p className="text-xs text-slate-500">Expira: {formatDateTimeTegucigalpa(qr.validUntil)}</p>
                <p className="text-xs text-slate-500">
                  Usos: {qr.usedCount}/{qr.maxUses === 9999 || qr.maxUses === 2147483647 ? "Ilimitado" : qr.maxUses}
                </p>
              </article>
            ))}
            {inactiveQrCodes.length === 0 ? (
              <p className="text-sm text-slate-600">No hay QRs inactivos de residentes.</p>
            ) : null}
          </div>
        </details>
      </Card>
    </>
  );
}
