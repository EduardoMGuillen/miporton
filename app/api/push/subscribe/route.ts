import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  try {
    const session = await getSession();
    if (
      !session ||
      (session.role !== "RESIDENT" &&
        session.role !== "GUARD" &&
        session.role !== "RESIDENTIAL_ADMIN")
    ) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as SubscriptionBody;

    // Token FCM opcional (solo si el cliente lo envia). Web VAPID es el camino principal.
    if (body.platform === "android" && body.token) {
      const endpointFcm = `fcm:${body.token}`;
      try {
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
      } catch (err) {
        console.error("[push/subscribe] FCM upsert failed", err);
        return NextResponse.json(
          { error: "No se pudo guardar el token FCM." },
          { status: 500 },
        );
      }
      return NextResponse.json({ ok: true });
    }

    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Suscripcion push invalida." }, { status: 400 });
    }

    // Upsert minimo (como el flujo que ya funcionaba). platform usa default "web".
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        p256dh,
        auth,
        userId: session.userId,
      },
      create: {
        endpoint,
        p256dh,
        auth,
        userId: session.userId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return NextResponse.json(
      { error: "No se pudo guardar la suscripcion. Intenta de nuevo." },
      { status: 500 },
    );
  }
}
