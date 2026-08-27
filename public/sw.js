/* Service Worker - Push Notifications (Web Push VAPID) */
self.addEventListener("fetch", function () {});

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let title = "MiVisita";
  let body = "";
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
      const notif = data.notification;
      if (notif && (notif.title != null || notif.body != null)) {
        title = notif.title != null && notif.title !== "" ? notif.title : title;
        body = notif.body != null ? String(notif.body) : "";
        if (data.data) data = data.data;
      } else {
        title = data.title != null && data.title !== "" ? data.title : title;
        body = data.body != null ? String(data.body) : "";
      }
    } catch (e) {
      try {
        body = event.data.text() || "";
      } catch (_) {}
    }
  }
  const options = {
    body: body || "Tienes una nueva alerta de MiVisita.",
    icon: "/icon-192.png",
    badge: "/icon-48.png",
    tag: data.type ? String(data.type) : data.url ? String(data.url) : "mivisita-default",
    renotify: true,
    data: data || {},
  };
  event.waitUntil(
    Promise.all([
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          client.postMessage({ type: "MI_VISITA_NEW_VISIT" });
        }
      }),
      self.registration.showNotification(title, options),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/resident";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          try {
            client.navigate(targetUrl);
          } catch (_) {}
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
