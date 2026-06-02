import QRCode from "qrcode";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { Card } from "@/app/components/shell";
import { CreateQrForm } from "@/app/resident/create-qr-form";
import { CreateZoneReservationForm } from "@/app/resident/create-zone-reservation-form";
import { ReservationRowActions } from "@/app/resident/reservation-row-actions";
import { deleteInviteQrAction } from "@/app/resident/actions";
import { QrShareActions } from "@/app/resident/qr-share-actions";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";
import type { ResidentLocale } from "@/lib/resident-locale";

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

function validityLabel(locale: ResidentLocale, validityType: InviteWithImage["validityType"]) {
  if (validityType === "SINGLE_USE") return residentT(locale, "validity.single");
  if (validityType === "ONE_DAY") return residentT(locale, "validity.oneDay");
  if (validityType === "INFINITE") return residentT(locale, "validity.infinite");
  return residentT(locale, "validity.threeDays");
}

export default async function ResidentPage() {
  const locale = await getResidentLocale();
  const t = (key: string, vars?: Record<string, string | number>) => residentT(locale, key, vars);
  const session = await requireRole(["RESIDENT"]);
  const residential = session.residentialId
    ? await prisma.residential.findUnique({
        where: { id: session.residentialId },
        select: {
          name: true,
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

  const now = new Date();

  // Importante: antes se ordenaba por validUntil asc + take(40), así los 40 "más viejos"
  // por fecha de expiración eran casi siempre expirados y el QR recién creado quedaba fuera.
  const [futureDated, expiredByDate, totalQrCount] = await Promise.all([
    prisma.qrCode.findMany({
      where: { residentId: session.userId, validUntil: { gte: now } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.qrCode.findMany({
      where: { residentId: session.userId, validUntil: { lt: now } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.qrCode.count({ where: { residentId: session.userId } }),
  ]);

  const activeRows = futureDated.filter((i) => !i.isRevoked && i.usedCount < i.maxUses);
  const expiredFromFuture = futureDated.filter((i) => i.isRevoked || i.usedCount >= i.maxUses);

  const expiredById = new Map<string, (typeof futureDated)[0]>();
  for (const row of [...expiredFromFuture, ...expiredByDate]) {
    expiredById.set(row.id, row);
  }
  const expiredRows = Array.from(expiredById.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);
  const [zones, reservations, zoneReservations, zoneBlocks] = await Promise.all([
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
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            maxHoursPerReservation: true,
            oneReservationPerDay: true,
            reservationWeekdaysMask: true,
            scheduleStartHour: true,
            scheduleEndHour: true,
          },
        },
      },
      orderBy: { startsAt: "asc" },
      take: 40,
    }),
    prisma.zoneReservation.findMany({
      where: {
        residentialId: session.residentialId ?? "",
        status: "APPROVED",
      },
      select: {
        id: true,
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
  ]);

  const mapToInviteWithImage = async (invite: (typeof activeRows)[0]): Promise<InviteWithImage> => ({
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
  });

  const [activeInvites, expiredInvites] = await Promise.all([
    Promise.all(activeRows.map(mapToInviteWithImage)),
    Promise.all(expiredRows.map(mapToInviteWithImage)),
  ]);
  const zoneOccupiedSlots = [
    ...zoneReservations.map((item) => ({
      zoneId: item.zoneId,
      startsAtIso: item.startsAt.toISOString(),
      endsAtIso: item.endsAt.toISOString(),
      source: "reservation" as const,
      reservationId: item.id,
    })),
    ...zoneBlocks.map((item) => ({
      zoneId: item.zoneId,
      startsAtIso: item.startsAt.toISOString(),
      endsAtIso: item.endsAt.toISOString(),
      source: "block" as const,
    })),
  ];

  return (
    <>
      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("home.createInvite")}</h2>
        <CreateQrForm allowedValidityTypes={allowedValidityTypes} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("home.reserveZone")}</h2>
        <CreateZoneReservationForm
          zones={zones.map((zone) => ({
            id: zone.id,
            name: zone.name,
            maxHoursPerReservation: zone.maxHoursPerReservation,
            oneReservationPerDay: zone.oneReservationPerDay,
            reservationWeekdaysMask: zone.reservationWeekdaysMask,
            scheduleStartHour: zone.scheduleStartHour,
            scheduleEndHour: zone.scheduleEndHour,
          }))}
          occupiedSlots={zoneOccupiedSlots}
        />

        <div className="mt-4 grid gap-2">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-sm font-semibold text-slate-900">{reservation.zone.name}</p>
              <p className="text-xs text-slate-600">
                {formatDateTimeTegucigalpa(reservation.startsAt)} - {formatDateTimeTegucigalpa(reservation.endsAt)}
              </p>
              {reservation.note ? (
                <p className="text-xs text-slate-500">
                  {t("home.note")}: {reservation.note}
                </p>
              ) : null}
              <ReservationRowActions
                  residentialName={residential?.name ?? undefined}
                  reservationId={reservation.id}
                  zoneId={reservation.zoneId}
                  zoneName={reservation.zone.name}
                  startsAtIso={reservation.startsAt.toISOString()}
                  endsAtIso={reservation.endsAt.toISOString()}
                  note={reservation.note}
                  zone={{
                    maxHoursPerReservation: reservation.zone.maxHoursPerReservation,
                    oneReservationPerDay: reservation.zone.oneReservationPerDay,
                    reservationWeekdaysMask: reservation.zone.reservationWeekdaysMask,
                    scheduleStartHour: reservation.zone.scheduleStartHour,
                    scheduleEndHour: reservation.zone.scheduleEndHour,
                  }}
                occupiedSlots={zoneOccupiedSlots}
              />
            </div>
          ))}
          {reservations.length === 0 ? (
            <p className="text-sm text-slate-600">{t("home.noReservations")}</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{t("home.activeQrs")}</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeInvites.map((invite) => (
            <article key={invite.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={invite.image}
                alt={t("home.qrAlt", { name: invite.visitorName })}
                className="mx-auto h-40 w-40 rounded-lg bg-white p-2 shadow-sm"
              />
              <p className="mt-3 text-sm font-semibold text-slate-900">{invite.visitorName}</p>
              <p className="text-xs text-slate-600">{validityLabel(locale, invite.validityType)}</p>
              {invite.description ? (
                <p className="text-xs text-slate-500">
                  {t("home.description")}: {invite.description}
                </p>
              ) : null}
              <p className="text-xs text-slate-500">
                {t("home.accessTypeLabel")}:{" "}
                {invite.hasVehicle ? t("home.accessVehicle") : t("home.accessPeatonal")}
              </p>
              <p className="text-xs text-slate-500">
                {t("home.expires")}: {formatDateTimeTegucigalpa(invite.validUntil)}
              </p>
              <p className="text-xs text-slate-500">
                {t("home.uses")}: {invite.usedCount}/
                {invite.maxUses === 9999 ? t("home.unlimited") : invite.maxUses}
              </p>
              <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-[10px] text-slate-500">
                MP:{invite.code}
              </p>
              <QrShareActions
                qrDataUrl={invite.image}
                visitorName={invite.visitorName}
                code={invite.code}
                validityLabel={validityLabel(locale, invite.validityType)}
                validUntilLabel={formatDateTimeTegucigalpa(invite.validUntil)}
                residentialName={residential?.name ?? t("home.residentialFallback")}
                residentName={session.fullName}
              />
              <form action={deleteInviteQrAction} className="mt-2">
                <input type="hidden" name="qrId" value={invite.id} />
                <button className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100">
                  {t("home.deleteQr")}
                </button>
              </form>
            </article>
          ))}
          {activeInvites.length === 0 ? (
            <p className="text-sm text-slate-600">{t("home.noActive")}</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <details>
          <summary className="cursor-pointer list-none text-lg font-semibold text-slate-900">
            <span className="inline-flex items-center gap-2">
              {t("home.expiredQrsCount", { n: expiredInvites.length })}
            </span>
          </summary>
          {totalQrCount > activeInvites.length + expiredInvites.length ? (
            <p className="mt-2 text-xs text-slate-500">{t("home.expiredNote")}</p>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {expiredInvites.map((invite) => (
              <article
                key={invite.id}
                className="rounded-xl border border-slate-200 bg-slate-100/80 p-4 opacity-90"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={invite.image}
                  alt={t("home.qrAlt", { name: invite.visitorName })}
                  className="mx-auto h-40 w-40 rounded-lg bg-white p-2 shadow-sm grayscale"
                />
                <p className="mt-3 text-sm font-semibold text-slate-900">{invite.visitorName}</p>
                <p className="text-xs text-slate-600">{validityLabel(locale, invite.validityType)}</p>
                {invite.description ? (
                  <p className="text-xs text-slate-500">
                    {t("home.description")}: {invite.description}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">
                  {t("home.accessTypeLabel")}:{" "}
                  {invite.hasVehicle ? t("home.accessVehicle") : t("home.accessPeatonal")}
                </p>
                <p className="text-xs text-slate-500">
                  {t("home.expires")}: {formatDateTimeTegucigalpa(invite.validUntil)}
                </p>
                <p className="text-xs text-slate-500">
                  {t("home.uses")}: {invite.usedCount}/
                  {invite.maxUses === 9999 ? t("home.unlimited") : invite.maxUses}
                </p>
                <p className="mt-2 break-all rounded-md bg-white px-2 py-1 text-[10px] text-slate-500">
                  MP:{invite.code}
                </p>
              </article>
            ))}
            {expiredInvites.length === 0 ? (
              <p className="text-sm text-slate-600">{t("home.noExpired")}</p>
            ) : null}
            {totalQrCount === 0 ? (
              <p className="text-sm text-slate-600">{t("home.noGenerated")}</p>
            ) : null}
          </div>
        </details>
      </Card>
    </>
  );
}
