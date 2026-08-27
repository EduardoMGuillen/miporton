/* Service Worker - Push Notifications (VAPID) */
self.addEventListener("fetch", function () {});

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  let title = "MiVisita";
  let body = "";
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
      title = data.title != null && data.title !== "" ? data.title : title;
      body = data.body != null ? String(data.body) : "";
    } catch (e) {
      try {
        body = event.data.text() || "";
      } catch (_) {}
    }
  }
  const options = {
    body: body || " ",
    icon: "/icon-192.png",
    badge: "/icon-48.png",
    tag: data.url ? String(data.url) : data.type ? String(data.type) : "mivisita-default",
    data: data || {},
  };
  event.waitUntil(
    self.registration.showNotification(title, options).catch(function (err) {
      console.error("[sw] showNotification failed", err);
    }),
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
