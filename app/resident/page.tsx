import QRCode from "qrcode";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateQrForm } from "@/app/resident/create-qr-form";
import { PushSubscriptionCard } from "@/app/resident/push-subscription";
import { deleteInviteQrAction } from "@/app/resident/actions";
import { QrShareActions } from "@/app/resident/qr-share-actions";

type InviteWithImage = {
  id: string;
  code: string;
  visitorName: string;
  validityType: "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS";
  validUntil: Date;
  usedCount: number;
  maxUses: number;
  image: string;
};

function validityLabel(validityType: InviteWithImage["validityType"]) {
  if (validityType === "SINGLE_USE") return "1 solo uso";
  if (validityType === "ONE_DAY") return "Valido por 1 dia";
  return "Valido por 3 dias";
}

export default async function ResidentPage() {
  const session = await requireRole(["RESIDENT"]);
  const residential = session.residentialId
    ? await prisma.residential.findUnique({
        where: { id: session.residentialId },
        select: { name: true },
      })
    : null;

  const invites = await prisma.qrCode.findMany({
    where: { residentId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  const invitesWithImage: InviteWithImage[] = await Promise.all(
    invites.map(async (invite) => ({
      id: invite.id,
      code: invite.code,
      visitorName: invite.visitorName,
      validityType: invite.validityType,
      validUntil: invite.validUntil,
      usedCount: invite.usedCount,
      maxUses: invite.maxUses,
      image: await QRCode.toDataURL(`MP:${invite.code}`),
    })),
  );

  return (
    <DashboardShell
      title="Panel de Residente"
      subtitle="Anuncia tus visitas y comparte su QR."
      user={session.fullName}
    >
      <PushSubscriptionCard />

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Crear anuncio de visita</h2>
        <CreateQrForm />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Mis QRs recientes</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {invitesWithImage.map((invite) => (
            <article key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invite.image}
                alt={`QR de ${invite.visitorName}`}
                className="mx-auto h-40 w-40 rounded-lg bg-white p-2 shadow-sm"
              />
              <p className="mt-3 text-sm font-semibold text-slate-900">{invite.visitorName}</p>
              <p className="text-xs text-slate-600">{validityLabel(invite.validityType)}</p>
              <p className="text-xs text-slate-500">
                Expira: {new Date(invite.validUntil).toLocaleString("es-DO")}
              </p>
              <p className="text-xs text-slate-500">
                Usos: {invite.usedCount}/{invite.maxUses === 9999 ? "Ilimitado" : invite.maxUses}
              </p>
              <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-[10px] text-slate-500">
                MP:{invite.code}
              </p>
              <QrShareActions
                qrDataUrl={invite.image}
                visitorName={invite.visitorName}
                code={invite.code}
                validityLabel={validityLabel(invite.validityType)}
                validUntilLabel={new Date(invite.validUntil).toLocaleString("es-DO")}
                residentialName={residential?.name ?? "Residencial"}
                residentName={session.fullName}
              />
              <form action={deleteInviteQrAction} className="mt-2">
                <input type="hidden" name="qrId" value={invite.id} />
                <button className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100">
                  Eliminar QR
                </button>
              </form>
            </article>
          ))}
          {invitesWithImage.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no has generado QRs.</p>
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
