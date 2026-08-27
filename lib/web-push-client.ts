"use client";

/**
 * Flujo de activación push copiado de gcbmesas (lib/client-push-subscribe.ts, ruta Web VAPID):
 * 1) pedir permiso
 * 2) registrar / esperar SW
 * 3) subscribe con reintentos
 * 4) POST al servidor
 */

export type EnablePushResult =
  | { ok: true }
  | { ok: false; message: string; denied?: boolean; unsupported?: boolean };

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function waitUntilActivated(worker: ServiceWorker | null | undefined) {
  if (!worker) return;
  if (worker.state === "activated") return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") done();
    });
    setTimeout(done, 8000);
  });
}

export async function enableWebPush(_vapidPublicKey?: string): Promise<EnablePushResult> {
  if ("Notification" in window) {
    const permFirst = await Notification.requestPermission();
    if (permFirst !== "granted") {
      return {
        ok: false,
        denied: true,
        message:
          permFirst === "denied"
            ? "Permiso denegado. Activa notificaciones en Ajustes del sitio o dispositivo."
            : "Permiso denegado",
      };
    }
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      ok: false,
      unsupported: true,
      message:
        "Tu navegador no soporta notificaciones push. Usa Chrome en el movil (y anade la web a pantalla de inicio) para recibirlas.",
    };
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg || !reg.active) {
      reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }

    const swWorker = reg.installing || reg.waiting || reg.active;
    await waitUntilActivated(swWorker);
    await navigator.serviceWorker.ready;

    const vapidRes = await fetch("/api/push/public-key", { cache: "no-store" });
    if (!vapidRes.ok) return { ok: false, message: "Push no disponible (servidor)" };
    const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
    if (!publicKey) return { ok: false, message: "Clave VAPID vacia" };

    const key = urlBase64ToUint8Array(publicKey);
    const maxRetries = 3;
    let sub: PushSubscription | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as BufferSource,
        });
        break;
      } catch (e) {
        if (attempt === maxRetries - 1) throw e;
      }
    }

    if (!sub) return { ok: false, message: "No se pudo suscribir a push" };

    const subscription = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys?.p256dh,
          auth: subscription.keys?.auth,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: (err as { error?: string }).error || "Error al registrar" };
    }

    return { ok: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isPushServiceError = /push service|Registration failed.*push/i.test(errMsg);

    let hint = "";
    if (isAndroid) {
      if (isPushServiceError) {
        hint =
          " Prueba: 1) Agregar la app a pantalla de inicio y abrir desde ahi 2) Usar WiFi 3) Actualizar Chrome 4) Reintentar.";
      } else {
        hint =
          " En Android: agrega la app a pantalla de inicio y abre desde ahi. Revisa que las notificaciones esten permitidas en Chrome.";
      }
    }
    return { ok: false, message: errMsg + hint };
  }
}

/** @deprecated alias — el botón pide permiso dentro de enableWebPush, como en gcbmesas */
export function requestNotificationPermissionFromGesture() {
  if (!("Notification" in window)) return Promise.resolve("denied" as NotificationPermission);
  return Notification.requestPermission();
}

export type EnablePushFailureCode =
  | "unsupported"
  | "denied"
  | "missing_vapid"
  | "register_fail"
  | "sw_fail"
  | "ios_install"
  | "timeout"
  | "error";
