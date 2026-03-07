import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { GuardQrScanner } from "@/app/guard/qr-scanner";
import { acceptAnnouncedVisitAction } from "@/app/guard/actions";
import { GuardPushSubscriptionCard } from "@/app/guard/push-subscription";
import { GuardAutoRefresh } from "@/app/guard/guard-auto-refresh";
import { GuardDeliveryAnnouncementForm } from "@/app/guard/delivery-announcement-form";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

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
    take: 40,
  });
  const recentRegisteredAnnouncements = await prisma.qrScan.findMany({
    where: {
      isValid: true,
      code: { residentialId: session.residentialId },
    },
    orderBy: { scannedAt: "desc" },
    take: 20,
    select: {
      id: true,
      scannedAt: true,
      reason: true,
      scanner: { select: { fullName: true } },
      code: {
        select: {
          visitorName: true,
          resident: { select: { fullName: true } },
        },
      },
    },
  });
  const pendingInvites = activeInvites.filter((invite) => invite.scans.length === 0);
  const residents = await prisma.user.findMany({
    where: {
      residentialId: session.residentialId,
      role: "RESIDENT",
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
    take: 100,
  });

  return (
    <DashboardShell
      title="Panel de Guardia"
      subtitle="Escanea y valida QRs de las visitas."
      user={session.fullName}
    >
      <GuardAutoRefresh />
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Escanear QR</h2>
        <GuardQrScanner />
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Delivery en entrada</h2>
        <p className="mb-4 text-sm text-slate-600">
          Selecciona el residente y notifica que su delivery esta en la entrada.
        </p>
        <GuardDeliveryAnnouncementForm residents={residents} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Anuncios recientes</h2>
        <GuardPushSubscriptionCard />
        <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Anuncios pendientes
        </h3>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {pendingInvites.map((invite) => (
            <div key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{invite.visitorName}</p>
              <p className="text-sm text-slate-600">Residente: {invite.resident.fullName}</p>
              <p className="text-xs text-slate-500">
                Expira: {formatDateTimeTegucigalpa(invite.validUntil)}
              </p>
              <form action={acceptAnnouncedVisitAction} className="mt-2">
                <input type="hidden" name="qrId" value={invite.id} />
                <button className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
                  Aceptar llegada manualmente
                </button>
              </form>
            </div>
          ))}
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-slate-600">No hay anuncios pendientes ahora mismo.</p>
          ) : null}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-slate-700">
            Ultimos 20 anuncios registrados
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {recentRegisteredAnnouncements.map((record) => (
              <div key={record.id} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                <p className="font-semibold text-slate-900">{record.code.visitorName}</p>
                <p className="text-sm text-slate-700">Residente: {record.code.resident.fullName}</p>
                <p className="text-xs text-slate-600">Guardia: {record.scanner.fullName}</p>
                <p className="text-xs text-slate-600">
                  Registrado: {formatDateTimeTegucigalpa(record.scannedAt)}
                </p>
                <p className="mt-1 text-xs text-slate-600">{record.reason}</p>
              </div>
            ))}
            {recentRegisteredAnnouncements.length === 0 ? (
              <p className="text-sm text-slate-600">Aun no hay anuncios registrados.</p>
            ) : null}
          </div>
        </details>
      </Card>
    </DashboardShell>
  );
}
