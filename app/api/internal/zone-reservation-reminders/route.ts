import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/push";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

const REMINDER_WINDOW_MINUTES = 60;

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000);

  const pendingReminders = await prisma.zoneReservation.findMany({
    where: {
      status: "APPROVED",
      reminderSentAt: null,
      startsAt: {
        gt: now,
        lte: windowEnd,
      },
    },
    include: {
      zone: { select: { name: true } },
      resident: { select: { id: true, fullName: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 300,
  });

  let sent = 0;
  for (const reservation of pendingReminders) {
    const updated = await prisma.zoneReservation.updateMany({
      where: {
        id: reservation.id,
        status: "APPROVED",
        reminderSentAt: null,
      },
      data: { reminderSentAt: new Date() },
    });
    if (updated.count === 0) continue;

    await notifyUser(reservation.resident.id, {
      title: "Recordatorio de reserva",
      body: `${reservation.resident.fullName}, tu reserva de ${reservation.zone.name} inicia a las ${formatDateTimeTegucigalpa(reservation.startsAt)}.`,
      url: "/resident",
    });
    sent += 1;
  }

  return NextResponse.json({
    ok: true,
    scanned: pendingReminders.length,
    sent,
    windowMinutes: REMINDER_WINDOW_MINUTES,
  });
}
