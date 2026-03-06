import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateResidentialUserForm } from "@/app/residential-admin/create-user-form";
import {
  deleteResidentialUserAction,
  updateResidentialUserAction,
} from "@/app/residential-admin/actions";

export default async function ResidentialAdminPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const [residential, users, idEvidenceScans] = await Promise.all([
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
    prisma.qrScan.findMany({
      where: {
        isValid: true,
        idPhotoData: { not: null },
        code: { residentialId: session.residentialId },
      },
      orderBy: { scannedAt: "desc" },
      take: 50,
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
          },
        },
      },
    }),
  ]);

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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Usuarios de la residencial</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-sm text-slate-600">
                {user.email} - {user.role === "RESIDENT" ? "Residente" : "Guardia"}
              </p>
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
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Registro de IDs (ultimos 30 dias)</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {idEvidenceScans.map((scan) => (
            <article key={scan.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/id-evidence/${scan.id}`}
                alt={`ID de ${scan.code.visitorName}`}
                className="h-44 w-full rounded-lg border border-slate-200 object-cover bg-white"
                loading="lazy"
              />
              <p className="mt-3 text-sm font-semibold text-slate-900">Visita: {scan.code.visitorName}</p>
              <p className="text-xs text-slate-600">Residente: {scan.code.resident.fullName}</p>
              <p className="text-xs text-slate-600">Guardia: {scan.scanner.fullName}</p>
              <p className="text-xs text-slate-500">
                Fecha: {new Date(scan.scannedAt).toLocaleString("es-DO")}
              </p>
              <p className="text-xs text-slate-500">Tamano: {scan.idPhotoSize ?? 0} bytes</p>
              <p className="mt-2 text-xs text-slate-500">{scan.reason}</p>
            </article>
          ))}
          {idEvidenceScans.length === 0 ? (
            <p className="text-sm text-slate-600">No hay evidencias de IDs disponibles.</p>
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
