import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPushConfigured } from "@/lib/push";

type SubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
  platform?: string;
  token?: string;
};

export async function POST(request: Request) {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "RESIDENT" && session.role !== "GUARD" && session.role !== "RESIDENTIAL_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json({ error: "Notificaciones push no configuradas." }, { status: 503 });
  }

  const body = (await request.json()) as SubscriptionBody;

  // Android FCM (PWA/APK con Firebase), igual que gcbmesas
  if (body.platform === "android" && body.token) {
    const endpointFcm = `fcm:${body.token}`;
    await prisma.pushSubscription.upsert({
      where: { endpoint: endpointFcm },
      update: {
        userId: session.userId,
        platform: "android",
        p256dh: null,
        auth: null,
      },
      create: {
        endpoint: endpointFcm,
        platform: "android",
        p256dh: null,
        auth: null,
        userId: session.userId,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripcion push invalida." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh,
      auth,
      platform: "web",
      userId: session.userId,
    },
    create: {
      endpoint,
      p256dh,
      auth,
      platform: "web",
      userId: session.userId,
    },
  });

  return NextResponse.json({ ok: true });
}
