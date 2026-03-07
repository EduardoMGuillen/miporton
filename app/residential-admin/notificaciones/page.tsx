import { Card } from "@/app/components/shell";
import { requireRole } from "@/lib/authorization";
import { ResidentialAdminNotificationsButton } from "@/app/residential-admin/notifications-button";

export default async function ResidentialAdminNotificationsPage() {
  await requireRole(["RESIDENTIAL_ADMIN"]);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Notificaciones</h2>
      <ResidentialAdminNotificationsButton />
    </Card>
  );
}
