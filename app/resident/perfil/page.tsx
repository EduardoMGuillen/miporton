import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";

function categoryLabel(category: "OWNER" | "TENANT") {
  if (category === "TENANT") return "Inquilino";
  return "Propietario";
}

export default async function ResidentProfilePage() {
  const session = await requireRole(["RESIDENT"]);
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      fullName: true,
      email: true,
      personalEmail: true,
      phoneNumber: true,
      houseNumber: true,
      residentCategory: true,
      residential: { select: { name: true } },
    },
  });

  if (!user) {
    return <p className="p-6 text-red-600">No se encontro tu usuario.</p>;
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Datos de tu cuenta</h2>
      <dl className="grid gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</dt>
          <dd className="mt-1 font-medium text-slate-900">{user.fullName}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correo de acceso</dt>
          <dd className="mt-1 break-all font-medium text-slate-900">{user.email}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Residencial</dt>
          <dd className="mt-1 font-medium text-slate-900">{user.residential?.name ?? "Sin asignar"}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vivienda</dt>
          <dd className="mt-1 font-medium text-slate-900">{user.houseNumber?.trim() || "Sin numero registrado"}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</dt>
          <dd className="mt-1 font-medium text-slate-900">{categoryLabel(user.residentCategory)}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correo personal</dt>
          <dd className="mt-1 break-all text-slate-800">{user.personalEmail?.trim() || "Sin registrar"}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Telefono</dt>
          <dd className="mt-1 text-slate-800">{user.phoneNumber?.trim() || "Sin registrar"}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-slate-500">
        Para editar correo personal y telefono de contacto, usa{" "}
        <span className="font-semibold text-slate-700">Ajustes</span>.
      </p>
    </Card>
  );
}
