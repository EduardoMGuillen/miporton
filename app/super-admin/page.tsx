import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateResidentialForm } from "@/app/super-admin/create-residential-form";
import {
  deleteResidentialAdminAction,
  updateResidentialAdminAction,
} from "@/app/super-admin/actions";

export default async function SuperAdminPage() {
  const session = await requireRole(["SUPER_ADMIN"]);

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
    </DashboardShell>
  );
}
