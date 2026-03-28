import { Card } from "@/app/components/shell";
import { CreateAnnouncementForm } from "@/app/residential-admin/create-announcement-form";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export default async function ResidentialAdminAnnouncementsPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const residents = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: "RESIDENT",
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const recentAnnouncements = await prisma.adminAnnouncement.findMany({
    where: { residentialId: session.residentialId },
    include: { _count: { select: { recipients: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Comunicados a residentes</h2>
      <CreateAnnouncementForm residents={residents} />
      <div className="mt-4 grid gap-2">
        {recentAnnouncements.map((announcement) => (
          <div key={announcement.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
            <p className="text-xs text-slate-600">
              Enviado: {formatDateTimeTegucigalpa(announcement.createdAt)} | Destinatarios:{" "}
              {announcement._count.recipients}
            </p>
            <p className="text-xs text-slate-500">{announcement.message}</p>
          </div>
        ))}
        {recentAnnouncements.length === 0 ? (
          <p className="text-sm text-slate-600">Aun no se han enviado comunicados.</p>
        ) : null}
      </div>
    </Card>
  );
}
