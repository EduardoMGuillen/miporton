import type { ReactNode } from "react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";
import { ResidentShell } from "@/app/resident/resident-shell";
import { ResidentI18nProvider } from "@/app/resident/resident-i18n-context";

export default async function ResidentLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["RESIDENT"]);
  const locale = await getResidentLocale();
  const residential = session.residentialId
    ? await prisma.residential.findUnique({
        where: { id: session.residentialId },
        select: { name: true },
      })
    : null;

  const residentialLabel = residential?.name ?? residentT(locale, "layout.noResidential");

  return (
    <ResidentI18nProvider locale={locale}>
      <ResidentShell userFullName={session.fullName} residentialName={residentialLabel}>
        {children}
      </ResidentShell>
    </ResidentI18nProvider>
  );
}
