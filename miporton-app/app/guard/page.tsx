import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { GuardQrScanner } from "@/app/guard/qr-scanner";
import { confirmManualExitAction } from "@/app/guard/actions";
import { GuardPushSubscriptionCard } from "@/app/guard/push-subscription";
import { GuardAutoRefresh } from "@/app/guard/guard-auto-refresh";
import { GuardDeliveryAnnouncementForm } from "@/app/guard/delivery-announcement-form";
import { ManualConfirmStartButton } from "@/app/guard/manual-confirm-start-button";
import { ManualExitSubmitButton } from "@/app/guard/manual-exit-submit-button";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

function tegucigalpaTodayRange(now = new Date()) {
  const tegucigalpaOffsetHours = 6;
  const shifted = new Date(now.getTime() - tegucigalpaOffsetHours * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const start = new Date(Date.UTC(year, month, day, tegucigalpaOffsetHours, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day + 1, tegucigalpaOffsetHours, 0, 0, 0));
  return { start, end };
}

export default async function GuardPage() {
  const session = await requireRole(["GUARD"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida sin residencial.</p>;
  }

  const { start: todayStart, end: todayEnd } = tegucigalpaTodayRange();

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
  const pendingExitEntries = await prisma.qrScan.findMany({
    where: {
      isValid: true,
      exitedAt: null,
      code: { residentialId: session.residentialId },
    },
    orderBy: { scannedAt: "desc" },
    take: 20,
    select: {
      id: true,
      scannedAt: true,
      reason: true,
      idPhotoSize: true,
      platePhotoSize: true,
      scanner: { select: { fullName: true } },
      code: {
        select: {
          visitorName: true,
          resident: { select: { fullName: true } },
        },
      },
    },
  });
  const todayZoneReservations = await prisma.zoneReservation.findMany({
    where: {
      residentialId: session.residentialId,
      status: "APPROVED",
      startsAt: { gte: todayStart, lt: todayEnd },
    },
    include: {
      zone: { select: { name: true } },
      resident: { select: { fullName: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 80,
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
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Reservas de zonas para hoy</h2>
        <p className="mb-4 text-sm text-slate-600">
          Reservas activas del dia actual para control de acceso en caseta.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {todayZoneReservations.map((reservation) => (
            <div key={reservation.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="font-semibold text-slate-900">{reservation.zone.name}</p>
              <p className="text-sm text-slate-700">Residente: {reservation.resident.fullName}</p>
              <p className="text-xs text-slate-600">
                Horario: {formatDateTimeTegucigalpa(reservation.startsAt)} -{" "}
                {formatDateTimeTegucigalpa(reservation.endsAt)}
              </p>
              {reservation.note ? <p className="mt-1 text-xs text-slate-500">{reservation.note}</p> : null}
            </div>
          ))}
          {todayZoneReservations.length === 0 ? (
            <p className="text-sm text-slate-600">No hay reservas activas para hoy.</p>
          ) : null}
        </div>
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
              {invite.description ? (
                <p className="text-xs text-slate-600">Descripcion: {invite.description}</p>
              ) : null}
              <p className="text-xs text-slate-500">
                Tipo de acceso: {invite.hasVehicle ? "Vehiculo" : "Acceso peatonal"}
              </p>
              <p className="text-xs text-slate-500">
                Expira: {formatDateTimeTegucigalpa(invite.validUntil)}
              </p>
              <ManualConfirmStartButton code={invite.code} />
            </div>
          ))}
          {pendingInvites.length === 0 ? (
            <p className="text-sm text-slate-600">No hay anuncios pendientes ahora mismo.</p>
          ) : null}
        </div>

        <h3 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate-700">
          Confirmar salida manual
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Muestra todas las entradas pendientes. Tambien pueden marcar salida escaneando QR.
        </p>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          {pendingExitEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
              <p className="font-semibold text-slate-900">{entry.code.visitorName}</p>
              <p className="text-sm text-slate-700">Residente: {entry.code.resident.fullName}</p>
              <p className="text-xs text-slate-600">Guardia: {entry.scanner.fullName}</p>
              <p className="text-xs text-slate-600">
                Registrado: {formatDateTimeTegucigalpa(entry.scannedAt)}
              </p>
              <p className="text-xs text-slate-500">
                Evidencia ID: {entry.idPhotoSize ? "Si" : "No"} | Evidencia placa:{" "}
                {entry.platePhotoSize ? "Si" : "No"}
              </p>
              <p className="mt-1 text-xs text-slate-600">{entry.reason}</p>
              <form action={confirmManualExitAction} className="mt-2">
                <input type="hidden" name="scanId" value={entry.id} />
                <ManualExitSubmitButton />
              </form>
            </div>
          ))}
          {pendingExitEntries.length === 0 ? (
            <p className="text-sm text-slate-600">No hay entradas pendientes de salida.</p>
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
