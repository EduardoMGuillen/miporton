"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/app/components/shell";
import { ResidentMenu } from "@/app/resident/resident-menu";

const ROUTE_META: Record<string, { title: string; subtitle: string }> = {
  "/resident": {
    title: "Panel de Residente",
    subtitle: "Anuncia tus visitas y comparte su QR.",
  },
  "/resident/perfil": {
    title: "Mi perfil",
    subtitle: "Datos de tu cuenta y vivienda.",
  },
  "/resident/soporte": {
    title: "Soporte",
    subtitle: "Contacto y comunicados de tu residencial.",
  },
  "/resident/sugerencias": {
    title: "Sugerencias",
    subtitle: "Envia ideas a la administracion.",
  },
  "/resident/ajustes": {
    title: "Ajustes",
    subtitle: "Notificaciones y datos de contacto.",
  },
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
  const pathname = usePathname() ?? "/resident";
  const path = normalizePath(pathname);
  const meta = ROUTE_META[path] ?? {
    title: "Residente",
    subtitle: "MiVisita",
  };

  return (
    <DashboardShell
      title={meta.title}
      subtitle={meta.subtitle}
      user={userFullName}
      showActiveSession={false}
      headerRight={<ResidentMenu userFullName={userFullName} residentialName={residentialName} />}
    >
      {children}
    </DashboardShell>
  );
}
