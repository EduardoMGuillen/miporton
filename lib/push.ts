import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
  process.env.VAPID_PUBLIC_KEY?.trim() ||
  "";
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() || "";
const contact = process.env.VAPID_CONTACT_EMAIL?.trim() || "mailto:admin@mivisita.app";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  type?: string;
};

function isFirebaseAdminConfigured() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim(),
  );
}

let firebaseReady = false;

type FirebaseAdminLike = {
  apps: unknown[];
  initializeApp: (options: { credential: unknown }) => unknown;
  credential: {
    cert: (cred: object) => unknown;
    applicationDefault: () => unknown;
  };
  messaging: () => {
    send: (message: {
      token: string;
      notification: { title: string; body: string };
      data?: Record<string, string>;
      android?: { priority: "high" };
      webpush?: { fcmOptions?: { link: string } };
    }) => Promise<string>;
  };
};

async function getFirebaseMessaging() {
  if (!isFirebaseAdminConfigured()) return null;
  const imported = (await import("firebase-admin")) as unknown as {
    default?: FirebaseAdminLike;
  } & FirebaseAdminLike;
  const admin = (imported.default ?? imported) as FirebaseAdminLike;
  if (!firebaseReady) {
    const credJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (credJson) {
      const cred = JSON.parse(credJson) as object;
      if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(cred) });
      }
    } else if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    }
    firebaseReady = true;
  }
  return admin.messaging();
}

export function isPushConfigured() {
  return Boolean((publicKey && privateKey) || isFirebaseAdminConfigured());
}

export async function notifyUser(userId: string, payload: PushPayload) {
  if (!isPushConfigured()) {
    console.warn("[Push] Sin VAPID ni Firebase Admin; no se envia a", userId);
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true, platform: true },
  });

  if (subscriptions.length === 0) return;

  const toRemove: string[] = [];
  const messaging = await getFirebaseMessaging().catch((err) => {
    console.error("[Push FCM] init failed", err);
    return null;
  });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      if (subscription.endpoint.startsWith("fcm:") || subscription.platform === "android") {
        const token = subscription.endpoint.startsWith("fcm:")
          ? subscription.endpoint.slice(4)
          : subscription.endpoint;
        if (!messaging) {
          console.warn("[Push FCM] Firebase Admin no configurado; se omite token");
          return;
        }
        try {
          await messaging.send({
            token,
            notification: { title: payload.title, body: payload.body },
            data: {
              title: payload.title,
              body: payload.body,
              ...(payload.url ? { url: payload.url } : {}),
              ...(payload.type ? { type: payload.type } : {}),
            },
            android: { priority: "high" },
            webpush: {
              fcmOptions: payload.url ? { link: payload.url } : undefined,
            },
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/invalid-registration-token|registration-token-not-registered|not-found/i.test(msg)) {
            toRemove.push(subscription.id);
          } else {
            console.error("[Push FCM] Error", msg);
          }
        }
        return;
      }

      if (!publicKey || !privateKey || !subscription.p256dh || !subscription.auth) {
        console.warn("[Push Web] Omitida suscripcion: faltan VAPID o keys");
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
          { TTL: 3600, contentEncoding: "aes128gcm" },
        );
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : undefined;
        if (statusCode === 410 || statusCode === 404) {
          toRemove.push(subscription.id);
        } else {
          console.error(
            "[Push Web] Error",
            statusCode ?? "",
            subscription.endpoint.slice(0, 64),
            err,
          );
        }
      }
    }),
  );

  if (toRemove.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: toRemove } } });
  }
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
