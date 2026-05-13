import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";
import { PushSubscriptionCard } from "@/app/resident/push-subscription";

export default async function ResidentSettingsPage() {
  const session = await requireRole(["RESIDENT"]);
  const residentContact = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      personalEmail: true,
      phoneNumber: true,
    },
  });

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Notificaciones y contacto</h2>
      <p className="mb-4 text-sm text-slate-600">
        Activa alertas en este dispositivo y manten actualizado tu correo personal y telefono.
      </p>
      <PushSubscriptionCard
        initialPersonalEmail={residentContact?.personalEmail ?? ""}
        initialPhoneNumber={residentContact?.phoneNumber ?? ""}
      />
    </Card>
  );
}
