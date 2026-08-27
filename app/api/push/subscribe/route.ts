import { randomUUID } from "crypto";
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

async function saveWebSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userId: string;
}) {
  const { endpoint, p256dh, auth, userId } = input;

  // Camino Prisma normal (esquema simple, sin platform/FCM).
  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, userId },
      create: { endpoint, p256dh, auth, userId },
    });
    return;
  } catch (err) {
    console.error("[push/subscribe] prisma upsert failed, trying raw SQL", err);
  }

  // Fallback SQL: funciona aunque la DB tenga columnas extra (platform) o Prisma desalineado.
  const id = randomUUID().replace(/-/g, "").slice(0, 25);
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "PushSubscription" (id, endpoint, p256dh, auth, "userId", "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (endpoint) DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      "userId" = EXCLUDED."userId",
      "updatedAt" = NOW()
    `,
    id,
    endpoint,
    p256dh,
    auth,
    userId,
  );
}

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
    const endpoint = body.endpoint?.trim();
    const p256dh = body.keys?.p256dh?.trim();
    const auth = body.keys?.auth?.trim();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Suscripcion push invalida." }, { status: 400 });
    }

    await saveWebSubscription({
      endpoint,
      p256dh,
      auth,
      userId: session.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return NextResponse.json(
      {
        error:
          "No se pudo guardar la suscripcion. Si el error continua, avisa a soporte (DB push).",
      },
      { status: 500 },
    );
  }
}
