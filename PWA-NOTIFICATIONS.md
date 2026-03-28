# PWA Push Notifications — Cómo funciona en este proyecto

Stack: **Next.js 15 (App Router) + Prisma + `web-push`**  
Sin plugins externos (sin `next-pwa`). El service worker se sirve manualmente desde `public/`.

---

## Arquitectura general

```
Browser                                    Servidor
──────────────────────────────             ─────────────────────────────
push-subscription.tsx                      app/api/push/subscribe/route.ts
  1. Notification.requestPermission()
  2. navigator.serviceWorker.register()
  3. pushManager.subscribe()           →    Guarda { endpoint, p256dh, auth }
                                            en la tabla PushSubscription (DB)

sw.js (service worker)                     lib/push.ts  (web-push)
  "push" event  ←─────────────────────     notifyUser()
    showNotification()                     notifyGuardsInResidential()
    postMessage() → ventanas abiertas      notifyResidentialAdminsInResidential()
  "notificationclick"
    navigate(targetUrl)
```

---

## 1. Variables de entorno

```env
# .env
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BDZh..."   # expuesta al browser
VAPID_PRIVATE_KEY="Id4b..."              # solo servidor
VAPID_CONTACT_EMAIL="mailto:admin@tuapp.app"
```

Generar un par de claves VAPID nuevas (una sola vez por proyecto):

```bash
npx web-push generate-vapid-keys
```

---

## 2. Base de datos — modelo Prisma

```prisma
// prisma/schema.prisma
model PushSubscription {
  id        String   @id @default(cuid())
  endpoint  String   @unique
  p256dh    String
  auth      String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Migración:

```bash
npx prisma migrate dev --name push_subscriptions
```

---

## 3. Service Worker — `public/sw.js`

Archivo estático en `public/`. Next.js lo sirve en `/sw.js` automáticamente.

```js
// public/sw.js

// Recibe el push del servidor y muestra la notificación
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const payload = event.data.json(); // { title, body, url }
  event.waitUntil(
    Promise.all([
      // Notifica a todas las ventanas abiertas de la app (para actualizar UI en tiempo real)
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: "MI_VISITA_NEW_VISIT" });
        }
      }),
      // Muestra la notificación del sistema operativo
      self.registration.showNotification(payload.title || "MiVisita", {
        body: payload.body || "Tienes una nueva notificacion.",
        icon: "/favicon.ico",
        data: { url: payload.url || "/resident" },
      }),
    ]),
  );
});

// Al hacer click en la notificación, navega a la URL indicada
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/resident";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return undefined;
    }),
  );
});
```

**El payload que espera el SW:**

```json
{ "title": "Nueva visita", "body": "Juan está en la entrada.", "url": "/resident" }
```

---

## 4. Utilidad del servidor — `lib/push.ts`

Toda la lógica de envío vive aquí. Instalar dependencia:

```bash
npm install web-push
npm install -D @types/web-push
```

```ts
// lib/push.ts
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";
const contact = process.env.VAPID_CONTACT_EMAIL ?? "mailto:admin@tuapp.app";

if (publicKey && privateKey) {
  webpush.setVapidDetails(contact, publicKey, privateKey);
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// Notifica a un usuario por su userId (todos sus dispositivos suscritos)
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
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch {
        // La suscripción expiró o es inválida → se elimina
        await prisma.pushSubscription.delete({ where: { id: subscription.id } });
      }
    }),
  );
}

// Notifica a todos los guardias de un residencial
export async function notifyGuardsInResidential(residentialId: string, payload: PushPayload) {
  const guards = await prisma.user.findMany({
    where: { residentialId, role: "GUARD" },
    select: { id: true },
  });
  await Promise.all(guards.map((g) => notifyUser(g.id, payload)));
}

// Notifica a todos los admins de un residencial
export async function notifyResidentialAdminsInResidential(residentialId: string, payload: PushPayload) {
  const admins = await prisma.user.findMany({
    where: { residentialId, role: "RESIDENTIAL_ADMIN" },
    select: { id: true },
  });
  await Promise.all(admins.map((a) => notifyUser(a.id, payload)));
}
```

---

## 5. API Route — `app/api/push/subscribe/route.ts`

Recibe la suscripción del browser y la guarda en la DB.

```ts
// app/api/push/subscribe/route.ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SubscriptionBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const session = await getSession();
  if (
    !session ||
    (session.role !== "RESIDENT" && session.role !== "GUARD" && session.role !== "RESIDENTIAL_ADMIN")
  ) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as SubscriptionBody;
  const { endpoint, keys } = body;
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Suscripcion push invalida." }, { status: 400 });
  }

  // upsert: si el endpoint ya existe solo actualiza las keys y el userId
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, userId: session.userId },
    create: { endpoint, p256dh, auth, userId: session.userId },
  });

  return NextResponse.json({ ok: true });
}
```

---

## 6. Componente del cliente — `push-subscription.tsx`

Se usa un componente React `"use client"` con un botón que activa el flujo de suscripción. Hay uno por rol (`resident`, `guard`, `residential-admin`) pero la lógica es idéntica.

```tsx
"use client";
import { useState } from "react";

// Convierte la VAPID public key de base64url a Uint8Array (requerido por la API del browser)
function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function PushSubscriptionCard() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function enablePush() {
    setPending(true);
    setMessage(null);
    try {
      // 1. Verificar soporte del browser
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Este navegador no soporta notificaciones push.");
        return;
      }

      // 2. Pedir permiso al usuario
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Debes permitir notificaciones para recibir alertas.");
        return;
      }

      // 3. Registrar el service worker
      const registration = await navigator.serviceWorker.register("/sw.js");

      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        setMessage("Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
        return;
      }

      // 4. Suscribirse al push manager del browser
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicVapidKey),
      });

      // 5. Enviar la suscripción al backend para guardarla en la DB
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription), // serializa endpoint + keys automáticamente
      });

      if (!response.ok) {
        setMessage("No se pudo registrar el dispositivo.");
        return;
      }

      setMessage("Notificaciones activadas correctamente.");
    } catch {
      setMessage("Ocurrio un error activando las notificaciones.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <h2>Notificaciones push</h2>
      <p>Activalas para recibir avisos en tiempo real.</p>
      <button onClick={enablePush} disabled={pending}>
        {pending ? "Activando..." : "Activar notificaciones"}
      </button>
      {message && <p>{message}</p>}
    </div>
  );
}
```

---

## 7. Cómo disparar una notificación desde el servidor

Desde cualquier Server Action o API Route:

```ts
import { notifyUser, notifyGuardsInResidential } from "@/lib/push";

// Notificar a un residente específico
await notifyUser(residentId, {
  title: "Tu visita llegó",
  body: "El guardia registró la entrada de Juan.",
  url: "/resident",
});

// Notificar a todos los guardias del residencial
await notifyGuardsInResidential(residentialId, {
  title: "Nueva visita anunciada",
  body: "El residente Carlos anunció a María.",
  url: "/guard",
});
```

---

## 8. Dónde se disparan en este proyecto

| Archivo | Acción | Función llamada | Escenario |
|---|---|---|---|
| `app/resident/actions.ts` | `createInviteAction` | `notifyGuardsInResidential` | Residente anuncia visita |
| `app/resident/actions.ts` | `createZoneReservationAction` | `notifyResidentialAdminsInResidential` | Residente reserva zona |
| `app/residential-admin/actions.ts` | `cancelZoneReservationAction` | `notifyUser` (residente) | Admin cancela reserva |
| `app/residential-admin/actions.ts` | `sendResidentialAnnouncementAction` | `notifyUser` (cada residente) | Admin envía comunicado |
| `app/guard/actions.ts` | `announceDeliveryAction` | `notifyUser` (residente) | Guardia anuncia delivery |
| `app/api/guard/scan-with-id/route.ts` | `POST` | `notifyUser` (residente) | Guardia escanea QR de visita |

---

## 9. Checklist para replicar en otro proyecto

- [ ] `npm install web-push` + `npm install -D @types/web-push`
- [ ] Generar claves VAPID: `npx web-push generate-vapid-keys`
- [ ] Agregar las 3 variables de entorno al `.env`
- [ ] Copiar `public/sw.js` (ajustar el `postMessage` type y la URL de fallback)
- [ ] Crear el modelo `PushSubscription` en Prisma y correr la migración
- [ ] Copiar `lib/push.ts` (ajustar roles si el esquema de usuarios es diferente)
- [ ] Copiar `app/api/push/subscribe/route.ts` (ajustar validación de roles)
- [ ] Copiar el componente cliente `push-subscription.tsx` y renderizarlo en la página del usuario
- [ ] Llamar `notifyUser(...)` desde los Server Actions o API Routes que lo necesiten
