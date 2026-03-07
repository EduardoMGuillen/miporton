import { Card } from "@/app/components/shell";
import { CreateResidentialUserForm } from "@/app/residential-admin/create-user-form";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  deleteResidentialUserAction,
  updateResidentialUserAction,
} from "@/app/residential-admin/actions";

export default async function ResidentialAdminUsersPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const users = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: { in: ["RESIDENT", "GUARD"] },
    },
    orderBy: { createdAt: "desc" },
  });
  const residentCategoryLabel = (value: "OWNER" | "TENANT") => (value === "OWNER" ? "Dueño" : "Inquilino");

  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Crear usuarios</h2>
        <CreateResidentialUserForm />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Usuarios de la residencial</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{user.fullName}</p>
                  <p className="text-sm text-slate-600">
                    {user.email} - {user.role === "RESIDENT" ? "Residente" : "Guardia"}
                  </p>
                  {user.role === "RESIDENT" ? (
                    <p className="text-xs text-slate-500">
                      Categoria: {residentCategoryLabel(user.residentCategory)}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-500">Vivienda: {user.houseNumber || "Sin definir"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <details>
                    <summary className="cursor-pointer rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100">
                      Editar
                    </summary>
                    <form action={updateResidentialUserAction} className="mt-2 grid min-w-[260px] gap-2">
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
                      {user.role === "RESIDENT" ? (
                        <>
                          <select
                            name="residentCategory"
                            defaultValue={user.residentCategory}
                            className="field-base"
                          >
                            <option value="OWNER">Dueño</option>
                            <option value="TENANT">Inquilino</option>
                          </select>
                          <input
                            name="houseNumber"
                            defaultValue={user.houseNumber ?? ""}
                            className="field-base"
                            placeholder="Numero de vivienda"
                          />
                        </>
                      ) : null}
                      <button className="btn-primary w-full">Guardar cambios</button>
                    </form>
                  </details>
                  <form action={deleteResidentialUserAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100">
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
          {users.length === 0 ? (
            <p className="text-sm text-slate-600">No hay usuarios creados todavia.</p>
          ) : null}
        </div>
      </Card>
    </>
  );
}
