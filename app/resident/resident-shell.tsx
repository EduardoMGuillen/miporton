"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/app/components/shell";
import { ResidentMenu } from "@/app/resident/resident-menu";
import { useResidentT } from "@/app/resident/resident-i18n-context";

const ROUTE_KEYS: Record<string, { titleKey: string; subtitleKey: string }> = {
  "/resident": { titleKey: "route.resident.title", subtitleKey: "route.resident.subtitle" },
  "/resident/anuncios": { titleKey: "route.anuncios.title", subtitleKey: "route.anuncios.subtitle" },
  "/resident/perfil": { titleKey: "route.perfil.title", subtitleKey: "route.perfil.subtitle" },
  "/resident/soporte": { titleKey: "route.soporte.title", subtitleKey: "route.soporte.subtitle" },
  "/resident/sugerencias": { titleKey: "route.sugerencias.title", subtitleKey: "route.sugerencias.subtitle" },
  "/resident/ajustes": { titleKey: "route.ajustes.title", subtitleKey: "route.ajustes.subtitle" },
};

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function ResidentShell({
  userFullName,
  residentialName,
  children,
}: {
  userFullName: string;
  residentialName: string;
  children: ReactNode;
}) {
  const { t } = useResidentT();
  const pathname = usePathname() ?? "/resident";
  const path = normalizePath(pathname);
  const keys = ROUTE_KEYS[path] ?? {
    titleKey: "route.default.title",
    subtitleKey: "route.default.subtitle",
  };

  return (
    <DashboardShell
      title={t(keys.titleKey)}
      subtitle={t(keys.subtitleKey)}
      user={userFullName}
      showActiveSession={false}
      compactHeaderActions
      headerRight={<ResidentMenu userFullName={userFullName} residentialName={residentialName} />}
    >
      {children}
    </DashboardShell>
  );
}
