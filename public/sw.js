const CACHE_NAME = "mivisita-push-v3";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.add(new Request(OFFLINE_URL, { cache: "reload", credentials: "omit" }));
      } catch {
        // Precache is optional. Push subscribe must not depend on it.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") {
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE_URL)));
});

self.addEventListener("push", (event) => {
  let payload = { title: "MiVisita", body: "Tienes una nueva notificacion.", url: "/resident" };
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    // Keep defaults when payload is not JSON.
  }

  event.waitUntil(
    Promise.all([
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: "MI_VISITA_NEW_VISIT" });
        }
      }),
      self.registration.showNotification(payload.title || "MiVisita", {
        body: payload.body || "Tienes una nueva notificacion.",
        icon: "/icon-192.png",
        badge: "/icon-48.png",
        data: { url: payload.url || "/resident" },
      }),
    ]),
  );
});

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
