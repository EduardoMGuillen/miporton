import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SubscriptionBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "RESIDENT" && session.role !== "GUARD")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as SubscriptionBody;
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
}
