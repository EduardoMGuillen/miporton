import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";
import type { ResidentLocale } from "@/lib/resident-locale";
import { ProfileContactForm } from "@/app/resident/profile-contact-form";

function categoryLabel(locale: ResidentLocale, category: "OWNER" | "TENANT") {
  if (category === "TENANT") return residentT(locale, "profile.categoryTenant");
  return residentT(locale, "profile.categoryOwner");
}

export default async function ResidentProfilePage() {
  const locale = await getResidentLocale();
  const t = (key: string, vars?: Record<string, string | number>) => residentT(locale, key, vars);
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
    return <p className="p-6 text-red-600">{t("profile.userNotFound")}</p>;
  }

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("profile.accountHeading")}</h2>
      <dl className="grid gap-3 text-sm">
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.name")}</dt>
          <dd className="mt-1 font-medium text-slate-900">{user.fullName}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.accessEmail")}</dt>
          <dd className="mt-1 break-all font-medium text-slate-900">{user.email}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.residential")}</dt>
          <dd className="mt-1 font-medium text-slate-900">{user.residential?.name ?? t("layout.noResidential")}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.unit")}</dt>
          <dd className="mt-1 font-medium text-slate-900">{user.houseNumber?.trim() || t("profile.noHouse")}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.category")}</dt>
          <dd className="mt-1 font-medium text-slate-900">{categoryLabel(locale, user.residentCategory)}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.personalEmail")}</dt>
          <dd className="mt-1 break-all text-slate-800">{user.personalEmail?.trim() || t("profile.notRegistered")}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("profile.phone")}</dt>
          <dd className="mt-1 text-slate-800">{user.phoneNumber?.trim() || t("profile.notRegistered")}</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <h3 className="text-base font-semibold text-slate-900">{t("profile.contactHeading")}</h3>
        <p className="mt-1 text-sm text-slate-600">{t("profile.contactIntro")}</p>
        <ProfileContactForm
          initialPersonalEmail={user.personalEmail ?? ""}
          initialPhoneNumber={user.phoneNumber ?? ""}
        />
      </div>
    </Card>
  );
}
