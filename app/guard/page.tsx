import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { GuardQrScanner } from "@/app/guard/qr-scanner";
import { acceptAnnouncedVisitAction } from "@/app/guard/actions";
import { GuardPushSubscriptionCard } from "@/app/guard/push-subscription";

export default async function GuardPage() {
  const session = await requireRole(["GUARD"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida sin residencial.</p>;
  }

  const activeInvites = await prisma.qrCode.findMany({
    where: {
      residentialId: session.residentialId,
      isRevoked: false,
      validUntil: { gte: new Date() },
    },
    include: {
      resident: { select: { fullName: true } },
      scans: {
        where: { isValid: true },
        orderBy: { scannedAt: "desc" },
        take: 1,
        select: { scannedAt: true, reason: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <DashboardShell
      title="Panel de Guardia"
      subtitle="Escanea y valida QRs de las visitas."
      user={session.fullName}
    >
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Escanear QR</h2>
        <GuardQrScanner />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Anuncios recientes</h2>
        <GuardPushSubscriptionCard />
        <div className="grid gap-3 md:grid-cols-2">
          {activeInvites.map((invite) => (
            <div key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{invite.visitorName}</p>
              <p className="text-sm text-slate-600">Residente: {invite.resident.fullName}</p>
              <p className="text-xs text-slate-500">
                Expira: {new Date(invite.validUntil).toLocaleString("es-DO")}
              </p>
              {invite.scans[0] ? (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                  Aceptado: {new Date(invite.scans[0].scannedAt).toLocaleString("es-DO")}
                </div>
              ) : (
                <form action={acceptAnnouncedVisitAction} className="mt-2">
                  <input type="hidden" name="qrId" value={invite.id} />
                  <button className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
                    Aceptar llegada manualmente
                  </button>
                </form>
              )}
            </div>
          ))}
          {activeInvites.length === 0 ? (
            <p className="text-sm text-slate-600">No hay anuncios activos ahora mismo.</p>
          ) : null}
        </div>
      </Card>
    </DashboardShell>
  );
}
