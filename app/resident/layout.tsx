import type { ReactNode } from "react";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { ResidentShell } from "@/app/resident/resident-shell";

export default async function ResidentLayout({ children }: { children: ReactNode }) {
  const session = await requireRole(["RESIDENT"]);
  const residential = session.residentialId
    ? await prisma.residential.findUnique({
        where: { id: session.residentialId },
        select: { name: true },
      })
    : null;

  return (
    <ResidentShell
      userFullName={session.fullName}
      residentialName={residential?.name ?? "Sin residencial"}
    >
      {children}
    </ResidentShell>
  );
}
