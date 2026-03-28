import { Card } from "@/app/components/shell";
import type { Prisma } from "@prisma/client";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import { PasswordField } from "@/app/components/password-field";
import { CreateResidentialUserForm } from "@/app/residential-admin/create-user-form";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import {
  deleteResidentialUserAction,
  toggleResidentialUserSuspensionAction,
  updateResidentialUserAction,
} from "@/app/residential-admin/actions";

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ResidentialAdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const params = await searchParams;
  const searchTerm = getSingleParam(params.q).trim();
  const roleFilter = getSingleParam(params.role).trim();
  const statusFilter = getSingleParam(params.status).trim();
  const normalizedRoleFilter = roleFilter === "RESIDENT" || roleFilter === "GUARD" ? roleFilter : "";

  const usersWhere: Prisma.UserWhereInput = {
    residentialId: session.residentialId,
    role: normalizedRoleFilter
      ? (normalizedRoleFilter as "RESIDENT" | "GUARD")
      : { in: ["RESIDENT", "GUARD"] },
    ...(statusFilter === "active"
      ? { isSuspended: false }
      : statusFilter === "suspended"
        ? { isSuspended: true }
        : {}),
    ...(searchTerm
      ? {
          OR: [
            { fullName: { contains: searchTerm, mode: "insensitive" as const } },
            { email: { contains: searchTerm, mode: "insensitive" as const } },
            { houseNumber: { contains: searchTerm, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const users = await prisma.user.findMany({
    where: usersWhere,
    orderBy: { createdAt: "desc" },
  });
  const totalUsersInResidential = await prisma.user.count({
    where: {
      residentialId: session.residentialId,
      role: { in: ["RESIDENT", "GUARD"] },
    },
  });
  const residentUsersCount = users.filter((user) => user.role === "RESIDENT").length;
  const guardUsersCount = users.filter((user) => user.role === "GUARD").length;
  const residentCategoryLabel = (value: "OWNER" | "TENANT") => (value === "OWNER" ? "Dueño" : "Inquilino");

  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Crear usuarios</h2>
        <CreateResidentialUserForm />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Usuarios de la residencial (Mostrando: {users.length} de {totalUsersInResidential} | Residentes:{" "}
          {residentUsersCount} | Guardias: {guardUsersCount})
        </h2>
        <form className="mb-4 grid gap-2 md:grid-cols-4">
          <input
            name="q"
            defaultValue={searchTerm}
            className="field-base md:col-span-2"
            placeholder="Buscar por nombre, correo o vivienda"
          />
          <select name="role" defaultValue={roleFilter} className="field-base">
            <option value="">Todos los roles</option>
            <option value="RESIDENT">Residentes</option>
            <option value="GUARD">Guardias</option>
          </select>
          <select name="status" defaultValue={statusFilter} className="field-base">
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="suspended">Suspendidos</option>
          </select>
          <button className="btn-primary w-full md:w-max">Aplicar filtros</button>
        </form>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{user.fullName}</p>
                  <p className="text-sm text-slate-600">
                    {user.email} - {user.role === "RESIDENT" ? "Residente" : "Guardia"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Estado: {user.isSuspended ? "Suspendido" : "Activo"}
                  </p>
                  {user.role === "RESIDENT" ? (
                    <p className="text-xs text-slate-500">
                      Categoria: {residentCategoryLabel(user.residentCategory)}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-500">Vivienda: {user.houseNumber || "Sin definir"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action={toggleResidentialUserSuspensionAction}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input
                      type="hidden"
                      name="nextStatus"
                      value={user.isSuspended ? "activate" : "suspend"}
                    />
                    <ConfirmSubmitButton
                      confirmMessage={
                        user.isSuspended
                          ? `¿Seguro que deseas activar la cuenta de ${user.fullName}?`
                          : `¿Seguro que deseas suspender la cuenta de ${user.fullName}?`
                      }
                      className={
                        user.isSuspended
                          ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                          : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                      }
                    >
                      {user.isSuspended ? "Activar cuenta" : "Suspender cuenta"}
                    </ConfirmSubmitButton>
                  </form>
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
                      <PasswordField
                        name="password"
                        placeholder="Nueva password (opcional)"
                        autoComplete="new-password"
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
                    <form action={deleteResidentialUserAction} className="mt-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <ConfirmSubmitButton
                        confirmMessage={`¿Seguro que deseas eliminar a ${user.fullName}?`}
                        className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                      >
                        Eliminar usuario
                      </ConfirmSubmitButton>
                    </form>
                  </details>
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
