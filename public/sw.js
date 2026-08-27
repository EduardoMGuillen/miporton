/* Service Worker - Push Notifications (mismo enfoque que gcbmesas) */
// Chrome Android exige un fetch handler para que el SW controle la PWA
self.addEventListener("fetch", function () {});

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
    tag: data.url ? String(data.url) : "mivisita-default",
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: data || {},
  };
  const promise = self.registration.showNotification(title, options).catch(function (err) {
    console.error("[sw] showNotification failed", err);
  });
  event.waitUntil(promise);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/resident";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
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
