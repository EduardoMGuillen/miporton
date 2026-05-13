import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

export default async function ResidentSupportPage() {
  const session = await requireRole(["RESIDENT"]);
  const residential = session.residentialId
    ? await prisma.residential.findUnique({
        where: { id: session.residentialId },
        select: { name: true, supportPhone: true },
      })
    : null;

  const latestAnnouncementRecipient = await prisma.adminAnnouncementRecipient.findFirst({
    where: { userId: session.userId },
    include: {
      announcement: {
        select: {
          title: true,
          message: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestAnnouncement = latestAnnouncementRecipient?.announcement ?? null;
  const supportPhoneDigits = (residential?.supportPhone ?? "").replaceAll(/\D+/g, "");
  const supportWhatsappUrl = supportPhoneDigits ? `https://wa.me/${supportPhoneDigits}` : null;

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Contacto</h2>
      <p className="mb-4 text-sm text-slate-600">
        Soporte configurado por tu residencial {residential?.name ? `(${residential.name})` : ""}.
      </p>
      {supportWhatsappUrl ? (
        <a
          href={supportWhatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Contactar soporte por WhatsApp
        </a>
      ) : (
        <p className="text-sm text-slate-600">Tu residencial aun no configura un numero de soporte.</p>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ultimo comunicado</p>
        {latestAnnouncement ? (
          <>
            <p className="mt-2 text-sm font-semibold text-slate-900">{latestAnnouncement.title}</p>
            <p className="text-xs text-slate-600">{formatDateTimeTegucigalpa(latestAnnouncement.createdAt)}</p>
            <p className="mt-2 text-sm text-slate-700">{latestAnnouncement.message}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-600">Aun no tienes comunicados.</p>
        )}
      </div>
    </Card>
  );
}
