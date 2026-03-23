import QRCode from "qrcode";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card, DashboardShell } from "@/app/components/shell";
import { CreateQrForm } from "@/app/resident/create-qr-form";
import { CreateZoneReservationForm } from "@/app/resident/create-zone-reservation-form";
import { ResidentSuggestionForm } from "@/app/resident/suggestion-form";
import { PushSubscriptionCard } from "@/app/resident/push-subscription";
import { deleteInviteQrAction, cancelZoneReservationAction } from "@/app/resident/actions";
import { QrShareActions } from "@/app/resident/qr-share-actions";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

type InviteWithImage = {
  id: string;
  code: string;
  visitorName: string;
  validityType: "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS" | "INFINITE";
  description?: string | null;
  hasVehicle: boolean;
  validUntil: Date;
  usedCount: number;
  maxUses: number;
  image: string;
};

function validityLabel(validityType: InviteWithImage["validityType"]) {
  if (validityType === "SINGLE_USE") return "1 solo uso";
  if (validityType === "ONE_DAY") return "Valido por 1 dia";
  if (validityType === "INFINITE") return "Sin vencimiento";
  return "Valido por 3 dias";
}

export default async function ResidentPage() {
  const session = await requireRole(["RESIDENT"]);
  const residential = session.residentialId
    ? await prisma.residential.findUnique({
        where: { id: session.residentialId },
        select: {
          name: true,
          supportPhone: true,
          allowResidentQrSingleUse: true,
          allowResidentQrOneDay: true,
          allowResidentQrThreeDays: true,
          allowResidentQrInfinite: true,
        },
      })
    : null;
  const allowedValidityTypes: Array<"SINGLE_USE" | "ONE_DAY" | "THREE_DAYS" | "INFINITE"> = [];
  if (residential?.allowResidentQrSingleUse ?? true) allowedValidityTypes.push("SINGLE_USE");
  if (residential?.allowResidentQrOneDay ?? true) allowedValidityTypes.push("ONE_DAY");
  if (residential?.allowResidentQrThreeDays ?? true) allowedValidityTypes.push("THREE_DAYS");
  if (residential?.allowResidentQrInfinite ?? true) allowedValidityTypes.push("INFINITE");

  const invites = await prisma.qrCode.findMany({
    where: { residentId: session.userId },
    orderBy: [{ validUntil: "asc" }, { createdAt: "desc" }],
    take: 40,
  });
  const [zones, reservations, zoneReservations, zoneBlocks, latestAnnouncementRecipient] = await Promise.all([
    prisma.zone.findMany({
      where: { residentialId: session.residentialId ?? "", isActive: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
    prisma.zoneReservation.findMany({
      where: {
        residentId: session.userId,
        status: "APPROVED",
      },
      include: { zone: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
      take: 40,
    }),
    prisma.zoneReservation.findMany({
      where: {
        residentialId: session.residentialId ?? "",
        status: "APPROVED",
      },
      select: {
        zoneId: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: "asc" },
      take: 800,
    }),
    prisma.zoneBlock.findMany({
      where: {
        residentialId: session.residentialId ?? "",
      },
      select: {
        zoneId: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: "asc" },
      take: 800,
    }),
    prisma.adminAnnouncementRecipient.findFirst({
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
    }),
  ]);
  const latestAnnouncement = latestAnnouncementRecipient?.announcement ?? null;

  const invitesWithImage: InviteWithImage[] = await Promise.all(
    invites.map(async (invite) => ({
      id: invite.id,
      code: invite.code,
      visitorName: invite.visitorName,
      validityType: invite.validityType,
      description: invite.description,
      hasVehicle: invite.hasVehicle,
      validUntil: invite.validUntil,
      usedCount: invite.usedCount,
      maxUses: invite.maxUses,
      image: await QRCode.toDataURL(`MP:${invite.code}`),
    })),
  );

  const now = new Date();
  const activeInvites = invitesWithImage.filter(
    (invite) => invite.validUntil >= now && invite.usedCount < invite.maxUses,
  );
  const expiredInvites = invitesWithImage.filter(
    (invite) => invite.validUntil < now || invite.usedCount >= invite.maxUses,
  );
  const supportPhoneDigits = (residential?.supportPhone ?? "").replaceAll(/\D+/g, "");
  const supportWhatsappUrl = supportPhoneDigits ? `https://wa.me/${supportPhoneDigits}` : null;

  return (
    <DashboardShell
      title="Panel de Residente"
      subtitle="Anuncia tus visitas y comparte su QR."
      user={session.fullName}
    >
      <PushSubscriptionCard />

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Crear anuncio de visita</h2>
        <CreateQrForm allowedValidityTypes={allowedValidityTypes} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Reservar zona comun</h2>
        <CreateZoneReservationForm
          zones={zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            maxHoursPerReservation: zone.maxHoursPerReservation,
            oneReservationPerDay: zone.oneReservationPerDay,
            scheduleStartHour: zone.scheduleStartHour,
            scheduleEndHour: zone.scheduleEndHour,
          }))}
          occupiedSlots={[
            ...zoneReservations.map((item) => ({
              zoneId: item.zoneId,
              startsAtIso: item.startsAt.toISOString(),
              endsAtIso: item.endsAt.toISOString(),
              source: "reservation" as const,
            })),
            ...zoneBlocks.map((item) => ({
              zoneId: item.zoneId,
              startsAtIso: item.startsAt.toISOString(),
              endsAtIso: item.endsAt.toISOString(),
              source: "block" as const,
            })),
          ]}
        />

        <div className="mt-4 grid gap-2">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-sm font-semibold text-slate-900">{reservation.zone.name}</p>
              <p className="text-xs text-slate-600">
                {formatDateTimeTegucigalpa(reservation.startsAt)} - {formatDateTimeTegucigalpa(reservation.endsAt)}
              </p>
              {reservation.note ? <p className="text-xs text-slate-500">Nota: {reservation.note}</p> : null}
              <form action={cancelZoneReservationAction} className="mt-2">
                <input type="hidden" name="reservationId" value={reservation.id} />
                <button className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                  Cancelar reserva
                </button>
              </form>
            </div>
          ))}
          {reservations.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no tienes reservas activas.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">QRs activos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeInvites.map((invite) => (
            <article key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invite.image}
                alt={`QR de ${invite.visitorName}`}
                className="mx-auto h-40 w-40 rounded-lg bg-white p-2 shadow-sm"
              />
              <p className="mt-3 text-sm font-semibold text-slate-900">{invite.visitorName}</p>
              <p className="text-xs text-slate-600">{validityLabel(invite.validityType)}</p>
              {invite.description ? (
                <p className="text-xs text-slate-500">Descripcion: {invite.description}</p>
              ) : null}
              <p className="text-xs text-slate-500">
                Tipo de acceso: {invite.hasVehicle ? "Vehiculo" : "Acceso peatonal"}
              </p>
              <p className="text-xs text-slate-500">
                Expira: {formatDateTimeTegucigalpa(invite.validUntil)}
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
                validUntilLabel={formatDateTimeTegucigalpa(invite.validUntil)}
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
          {activeInvites.length === 0 ? (
            <p className="text-sm text-slate-600">No tienes QRs activos ahora mismo.</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
            <span className="inline-flex items-center gap-2">QRs expirados ({expiredInvites.length})</span>
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {expiredInvites.map((invite) => (
              <article
                key={invite.id}
                className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={invite.image}
                  alt={`QR de ${invite.visitorName}`}
                  className="mx-auto h-40 w-40 rounded-lg bg-white p-2 shadow-sm grayscale"
                />
                <p className="mt-3 text-sm font-semibold text-slate-900">{invite.visitorName}</p>
                <p className="text-xs text-slate-600">{validityLabel(invite.validityType)}</p>
                {invite.description ? (
                  <p className="text-xs text-slate-500">Descripcion: {invite.description}</p>
                ) : null}
                <p className="text-xs text-slate-500">
                  Tipo de acceso: {invite.hasVehicle ? "Vehiculo" : "Acceso peatonal"}
                </p>
                <p className="text-xs text-slate-500">
                  Expira: {formatDateTimeTegucigalpa(invite.validUntil)}
                </p>
                <p className="text-xs text-slate-500">
                  Usos: {invite.usedCount}/{invite.maxUses === 9999 ? "Ilimitado" : invite.maxUses}
                </p>
                <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-[10px] text-slate-500">
                  MP:{invite.code}
                </p>
              </article>
            ))}
            {expiredInvites.length === 0 ? (
              <p className="text-sm text-slate-600">Aun no tienes QRs expirados.</p>
            ) : null}
            {invitesWithImage.length === 0 ? (
              <p className="text-sm text-slate-600">Aun no has generado QRs.</p>
            ) : null}
          </div>
        </details>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Soporte</h2>
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
          <p className="text-sm text-slate-600">
            Tu residencial aun no configura un numero de soporte.
          </p>
        )}
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Ultimo comunicado</p>
          {latestAnnouncement ? (
            <>
              <p className="mt-1 text-sm font-semibold text-slate-900">{latestAnnouncement.title}</p>
              <p className="text-xs text-slate-600">
                {formatDateTimeTegucigalpa(latestAnnouncement.createdAt)}
              </p>
              <p className="mt-1 text-sm text-slate-700">{latestAnnouncement.message}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Aun no tienes comunicados.</p>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sugerencias para la administracion</h2>
        <ResidentSuggestionForm />
      </Card>
    </DashboardShell>
  );
}
