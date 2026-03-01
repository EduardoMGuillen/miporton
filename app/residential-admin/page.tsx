import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateResidentialUserForm } from "@/app/residential-admin/create-user-form";

export default async function ResidentialAdminPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

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
            </div>
          ))}
          {users.length === 0 ? (
            <p className="text-sm text-slate-600">No hay usuarios creados todavia.</p>
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
