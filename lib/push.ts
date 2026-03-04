import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const contact = process.env.VAPID_CONTACT_EMAIL ?? "mailto:admin@miporton.app";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function notifyUser(userId: string, payload: PushPayload) {
  if (!publicKey || !privateKey) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
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
      } catch {
        await prisma.pushSubscription.delete({
          where: { id: subscription.id },
        });
      }
    }),
  );
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
