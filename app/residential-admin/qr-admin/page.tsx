import { Card } from "@/app/components/shell";
import { CreateAdminQrForm } from "@/app/residential-admin/create-admin-qr-form";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function ResidentialAdminQrPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const residents = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: "RESIDENT",
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Generar QR como administracion</h2>
      <CreateAdminQrForm residents={residents} />
    </Card>
  );
}
