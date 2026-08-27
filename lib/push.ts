import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
  process.env.VAPID_PUBLIC_KEY?.trim() ||
  "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
const contactRaw = process.env.VAPID_CONTACT_EMAIL?.trim() || "mailto:admin@mivisita.app";
const contact = contactRaw.startsWith("mailto:") ? contactRaw : `mailto:${contactRaw}`;

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: string;
};

export function isPushConfigured() {
  return Boolean(publicKey && privateKey);
}

export type NotifyUserResult = {
  total: number;
  sent: number;
  failed: number;
  removed: number;
};

export async function notifyUser(
  userId: string,
  payload: PushPayload,
): Promise<NotifyUserResult> {
  const empty: NotifyUserResult = { total: 0, sent: 0, failed: 0, removed: 0 };
  if (!publicKey || !privateKey) {
    console.warn("[Push] VAPID no configurado; no se envia a", userId);
    return empty;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return empty;

  const toRemove: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      // Tokens FCM legacy / filas rotas: no sirven con web-push.
      if (
        subscription.endpoint.startsWith("fcm:") ||
        !subscription.p256dh ||
        !subscription.auth
      ) {
        toRemove.push(subscription.id);
        return;
      }

      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : undefined;
        // Solo borrar endpoints muertos. Otros errores no deben vaciar la suscripcion.
        if (statusCode === 410 || statusCode === 404) {
          toRemove.push(subscription.id);
        } else {
          failed += 1;
          console.error(
            "[Push Web] Error",
            statusCode ?? "",
            subscription.endpoint.slice(0, 80),
            err,
          );
        }
      }
    }),
  );

  if (toRemove.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: toRemove } } });
  }

  return {
    total: subscriptions.length,
    sent,
    failed,
    removed: toRemove.length,
  };
}

export async function notifyGuardsInResidential(
  residentialId: string,
  payload: PushPayload,
) {
  const guards = await prisma.user.findMany({
    where: {
      residentialId,
      role: "GUARD",
    },
    select: { id: true },
  });

  await Promise.all(guards.map((guard) => notifyUser(guard.id, payload)));
}

export async function notifyResidentialAdminsInResidential(
  residentialId: string,
  payload: PushPayload,
) {
  const admins = await prisma.user.findMany({
    where: {
      residentialId,
      role: "RESIDENTIAL_ADMIN",
    },
    select: { id: true },
  });

  await Promise.all(admins.map((admin) => notifyUser(admin.id, payload)));
}
