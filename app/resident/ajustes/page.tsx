import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";
import { PushSubscriptionCard } from "@/app/resident/push-subscription";
import { ProfileContactForm } from "@/app/resident/profile-contact-form";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";
import { getVapidPublicKey } from "@/lib/vapid-public-key";

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
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("push.accountHeading")}</h2>
        <PushSubscriptionCard vapidPublicKey={getVapidPublicKey()} />
      </Card>
      <Card>
        <h2 className="mb-1 text-lg font-semibold text-slate-900">{t("profile.contactHeading")}</h2>
        <p className="text-sm text-slate-600">{t("profile.contactIntro")}</p>
        <ProfileContactForm
          initialPersonalEmail={residentContact?.personalEmail ?? ""}
          initialPhoneNumber={residentContact?.phoneNumber ?? ""}
        />
      </Card>
    </div>
  );
}
