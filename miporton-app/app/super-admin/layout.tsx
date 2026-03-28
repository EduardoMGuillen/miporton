import { DashboardShell } from "@/app/components/shell";
import { SuperAdminNav } from "@/app/super-admin/admin-nav";
import { requireRole } from "@/lib/authorization";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["SUPER_ADMIN"]);

  return (
    <DashboardShell
      title="Super Admin"
      subtitle="Gestion operativa global de residenciales y plataforma."
      user={session.fullName}
    >
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="surface-card p-4 lg:sticky lg:top-6 lg:h-fit">
          <SuperAdminNav />
        </aside>
        <div className="space-y-6">{children}</div>
      </div>
    </DashboardShell>
  );
}
