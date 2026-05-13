import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";
import { PushSubscriptionCard } from "@/app/resident/push-subscription";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";

export default async function ResidentSettingsPage() {
  const locale = await getResidentLocale();
  const t = (key: string) => residentT(locale, key);
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
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("settings.heading")}</h2>
      <p className="mb-4 text-sm text-slate-600">{t("settings.intro")}</p>
      <PushSubscriptionCard
        initialPersonalEmail={residentContact?.personalEmail ?? ""}
        initialPhoneNumber={residentContact?.phoneNumber ?? ""}
      />
    </Card>
  );
}
