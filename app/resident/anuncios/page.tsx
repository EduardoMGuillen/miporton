import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";

export default async function ResidentAnnouncementsPage() {
  const locale = await getResidentLocale();
  const t = (key: string, vars?: Record<string, string | number>) => residentT(locale, key, vars);
  const session = await requireRole(["RESIDENT"]);

  const announcements =
    session.residentialId != null
      ? await prisma.adminAnnouncement.findMany({
          where: {
            residentialId: session.residentialId,
            recipients: { some: { userId: session.userId } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            message: true,
            createdAt: true,
          },
        })
      : [];

  return (
    <Card>
      <h2 className="mb-2 text-lg font-semibold text-slate-900">{t("announcements.heading")}</h2>
      <p className="mb-5 text-sm text-slate-600">{t("announcements.intro")}</p>

      {announcements.length === 0 ? (
        <p className="text-sm text-slate-600">{t("announcements.none")}</p>
      ) : (
        <ul className="space-y-4">
          {announcements.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-600">{formatDateTimeTegucigalpa(item.createdAt)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
