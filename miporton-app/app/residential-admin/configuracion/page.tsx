import { Card } from "@/app/components/shell";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ResidentialAdminNotificationsButton } from "@/app/residential-admin/notifications-button";
import { UpdateResidentialSettingsForm } from "@/app/residential-admin/update-residential-settings-form";

export default async function ResidentialAdminConfigurationPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const residential = await prisma.residential.findUnique({
    where: { id: session.residentialId },
    select: {
      supportPhone: true,
      allowResidentQrSingleUse: true,
      allowResidentQrOneDay: true,
      allowResidentQrThreeDays: true,
      allowResidentQrInfinite: true,
    },
  });

  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Configuracion</h2>
        <UpdateResidentialSettingsForm
          supportPhone={residential?.supportPhone ?? ""}
          allowResidentQrSingleUse={residential?.allowResidentQrSingleUse ?? true}
          allowResidentQrOneDay={residential?.allowResidentQrOneDay ?? true}
          allowResidentQrThreeDays={residential?.allowResidentQrThreeDays ?? true}
          allowResidentQrInfinite={residential?.allowResidentQrInfinite ?? true}
        />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Notificaciones</h2>
        <ResidentialAdminNotificationsButton />
      </Card>
    </>
  );
}
