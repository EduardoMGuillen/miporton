import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { GuardQrScanner } from "@/app/guard/qr-scanner";
import { GuardMobileRecovery } from "@/app/guard/mobile-recovery";

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
    include: { resident: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <DashboardShell
      title="Panel de Guardia"
      subtitle="Escanea y valida QRs de las visitas."
      user={session.fullName}
    >
      <GuardMobileRecovery />
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Escanear QR</h2>
        <GuardQrScanner />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Anuncios recientes</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {activeInvites.map((invite) => (
            <div key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{invite.visitorName}</p>
              <p className="text-sm text-slate-600">Residente: {invite.resident.fullName}</p>
              <p className="text-xs text-slate-500">
                Expira: {new Date(invite.validUntil).toLocaleString("es-DO")}
              </p>
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
