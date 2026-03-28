import { DashboardShell } from "@/app/components/shell";
import { ResidentialAdminNav } from "@/app/residential-admin/admin-nav";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function ResidentialAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  const residential = session.residentialId
    ? await prisma.residential.findUnique({
        where: { id: session.residentialId },
        select: { name: true },
      })
    : null;

  return (
    <DashboardShell
      title="Admin de Residencial"
      subtitle={`Gestion de usuarios para ${residential?.name ?? "tu residencial"}.`}
      user={session.fullName}
    >
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="surface-card p-4 lg:sticky lg:top-6 lg:h-fit">
          <ResidentialAdminNav />
        </aside>
        <div className="space-y-6">{children}</div>
      </div>
    </DashboardShell>
  );
}
