import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateResidentialForm } from "@/app/super-admin/create-residential-form";

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
    </DashboardShell>
  );
}
