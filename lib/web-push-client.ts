"use client";

/**
 * Activación Web Push (VAPID) — iOS PWA, Android Chrome/PWA, desktop.
 * Sin FCM en el cliente (getToken colgaba Android). Timeouts en cada paso.
 */

export type EnablePushResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; denied?: boolean; unsupported?: boolean };

export type TestPushResult =
  | { ok: true; message: string; sent?: number }
  | { ok: false; message: string };

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

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function subscriptionPayload(sub: PushSubscription) {
  const json = sub.toJSON();
  let p256dh = json.keys?.p256dh;
  let auth = json.keys?.auth;
  if (!p256dh || !auth) {
    const p256 = sub.getKey("p256dh");
    const a = sub.getKey("auth");
    if (p256) p256dh = arrayBufferToBase64Url(p256);
    if (a) auth = arrayBufferToBase64Url(a);
  }
  return {
    endpoint: json.endpoint || sub.endpoint,
    keys: { p256dh, auth },
  };
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean(nav.standalone)
  );
}

const IOS_INSTALL_MESSAGE =
  "En iPhone las notificaciones solo funcionan desde la app en Inicio (no Safari). Safari → Compartir → Agregar a pantalla de inicio → abre MiVisita desde ese icono → Activar notificaciones → Permitir.";

const IOS_DENIED_RESET_MESSAGE =
  "iOS ya bloqueó las notificaciones de MiVisita. Ajustes → Notificaciones → MiVisita → permitir. Si no aparece: borra el icono, limpia datos del sitio en Safari y vuelve a Agregar a Inicio.";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} (timeout ${ms / 1000}s)`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function waitUntilActivated(worker: ServiceWorker | null | undefined) {
  if (!worker) return;
  if (worker.state === "activated") return;
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") done();
    });
    setTimeout(done, 5000);
  });
}

async function ensureServiceWorker() {
  let reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg || !reg.active) {
    reg = await withTimeout(
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }),
      12000,
      "Registrar service worker",
    );
  }
  const swWorker = reg.installing || reg.waiting || reg.active;
  await waitUntilActivated(swWorker);
  await withTimeout(navigator.serviceWorker.ready, 10000, "Service worker listo");
  return reg;
}

async function fetchVapidPublicKey(passed?: string) {
  const fromProp = passed?.trim();
  if (fromProp) return fromProp;
  const vapidRes = await withTimeout(
    fetch("/api/push/public-key", { cache: "no-store" }),
    10000,
    "Clave VAPID",
  );
  if (!vapidRes.ok) return "";
  const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
  return publicKey?.trim() || "";
}

async function showLocalNotification(
  reg: ServiceWorkerRegistration,
  title: string,
  body: string,
  tag: string,
) {
  try {
    await reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-48.png",
      tag,
      renotify: true,
      data: { url: "/" },
    });
    return true;
  } catch {
    try {
      if (Notification.permission === "granted") {
        new Notification(title, { body, tag });
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }
}

async function postWebSubscription(sub: PushSubscription) {
  const payload = subscriptionPayload(sub);
  if (!payload.endpoint || !payload.keys.p256dh || !payload.keys.auth) {
    return {
      ok: false as const,
      message: "Suscripcion push invalida (faltan keys en el navegador).",
    };
  }

  const res = await withTimeout(
    fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: payload.endpoint,
        keys: {
          p256dh: payload.keys.p256dh,
          auth: payload.keys.auth,
        },
      }),
    }),
    15000,
    "Guardar suscripcion",
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      (err as { error?: string }).error ||
      (res.status === 401
        ? "Sesion expirada. Vuelve a iniciar sesion e intenta de nuevo."
        : `Error al registrar (${res.status})`);
    return { ok: false as const, message: msg };
  }
  return { ok: true as const };
}

async function getOrCreateSubscription(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
) {
  const key = urlBase64ToUint8Array(vapidPublicKey);

  // Reusar si ya existe (iOS / Android).
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  const maxRetries = 3;
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1200 * attempt));
      return await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as BufferSource,
        }),
        15000,
        "Suscribir push",
      );
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      // Si hay conflicto de applicationServerKey, limpiar y reintentar una vez.
      if (/applicationServerKey|already subscribed/i.test(msg) || attempt === 1) {
        try {
          const stale = await reg.pushManager.getSubscription();
          if (stale) await stale.unsubscribe();
        } catch {
          // continue
        }
      }
      if (attempt === maxRetries - 1) throw lastError;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo suscribir a push");
}

export async function sendTestPush(): Promise<TestPushResult> {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return {
        ok: false,
        message: "Primero pulsa Activar notificaciones y permite el permiso.",
      };
    }

    let localOk = false;
    if ("serviceWorker" in navigator) {
      try {
        const reg = await withTimeout(ensureServiceWorker(), 12000, "Service worker");
        localOk = await showLocalNotification(
          reg,
          "MiVisita — Prueba local",
          "Si ves esto, el permiso y el service worker funcionan en este telefono.",
          "mivisita-push-test-local",
        );
      } catch {
        // seguir con prueba de servidor
      }
    }

    const res = await withTimeout(
      fetch("/api/push/test", {
        method: "POST",
        credentials: "same-origin",
      }),
      20000,
      "Prueba push servidor",
    );
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      sent?: number;
      total?: number;
    };

    if (!res.ok) {
      if (localOk) {
        return {
          ok: false,
          message:
            (data.error || data.message || "El push del servidor fallo.") +
            " Se mostro una prueba local; vuelve a Activar notificaciones y reintenta.",
        };
      }
      return {
        ok: false,
        message: data.error || data.message || "No se pudo enviar la notificacion de prueba.",
      };
    }

    return {
      ok: true,
      sent: data.sent,
      message:
        data.message ||
        (localOk
          ? "Prueba local y push del servidor enviados. Revisa la bandeja (minimiza la app)."
          : "Push del servidor enviado. Revisa la bandeja del sistema."),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error al probar notificaciones.";
    return { ok: false, message: msg };
  }
}

export async function enableWebPush(vapidPublicKey?: string): Promise<EnablePushResult> {
  const run = async (): Promise<EnablePushResult> => {
    if (isIosDevice() && !isStandalonePwa()) {
      return {
        ok: false,
        denied: true,
        unsupported: true,
        message: IOS_INSTALL_MESSAGE,
      };
    }

    if (!("Notification" in window)) {
      return {
        ok: false,
        unsupported: true,
        message: isIosDevice()
          ? IOS_INSTALL_MESSAGE
          : "Tu navegador no soporta notificaciones. Usa Chrome y anade la web a pantalla de inicio.",
      };
    }

    if (Notification.permission === "denied") {
      return {
        ok: false,
        denied: true,
        message: isIosDevice()
          ? IOS_DENIED_RESET_MESSAGE
          : "Permiso denegado. Ajustes → Apps → Chrome (o MiVisita) → Notificaciones → permitir.",
      };
    }

    if (Notification.permission !== "granted") {
      const permFirst = await Notification.requestPermission();
      if (permFirst !== "granted") {
        return {
          ok: false,
          denied: true,
          message:
            permFirst === "denied"
              ? isIosDevice()
                ? IOS_DENIED_RESET_MESSAGE
                : "Permiso denegado. Activa notificaciones en Ajustes del telefono."
              : "Permiso denegado",
        };
      }
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return {
        ok: false,
        unsupported: true,
        message: isIosDevice()
          ? "Este iPhone no expone Push. Necesitas iOS 16.4+ y abrir MiVisita desde el icono de Inicio (PWA)."
          : "Tu navegador no soporta notificaciones push. Usa Chrome (PWA) y permite notificaciones.",
      };
    }

    const reg = await ensureServiceWorker();
    const publicKey = await fetchVapidPublicKey(vapidPublicKey);
    if (!publicKey) {
      return { ok: false, message: "Push no disponible (servidor / clave VAPID)." };
    }

    const sub = await getOrCreateSubscription(reg, publicKey);
    const saved = await postWebSubscription(sub);
    if (!saved.ok) return saved;

    await showLocalNotification(
      reg,
      "MiVisita",
      "Notificaciones activadas en este dispositivo.",
      "mivisita-push-enabled",
    );

    // Prueba de servidor en background (no bloquea el exito de activacion).
    void sendTestPush().catch(() => {});

    return {
      ok: true,
      message: "Notificaciones activadas. Deberias ver un aviso ahora; si no, pulsa Probar.",
    };
  };

  try {
    return await withTimeout(run(), 28000, "Activar notificaciones");
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isPushServiceError = /push service|Registration failed.*push/i.test(errMsg);

    let hint = "";
    if (isIosDevice()) {
      hint =
        " Si sigue fallando: borra el icono, limpia datos del sitio en Safari y vuelve a agregar a Inicio.";
    } else if (isAndroidDevice()) {
      if (isPushServiceError) {
        hint =
          " Prueba: abrir desde el icono PWA, WiFi, actualizar Chrome/Play Services, Notificaciones ON, reintentar.";
      } else {
        hint = " En Android abre desde el icono de la PWA (no solo una pestana).";
      }
    }
    return { ok: false, message: errMsg + hint };
  }
}

/** @deprecated alias */
export function requestNotificationPermissionFromGesture() {
  if (!("Notification" in window)) return Promise.resolve("denied" as NotificationPermission);
  if (isIosDevice() && !isStandalonePwa()) {
    return Promise.resolve("denied" as NotificationPermission);
  }
  if (Notification.permission === "denied") {
    return Promise.resolve("denied" as NotificationPermission);
  }
  if (Notification.permission === "granted") {
    return Promise.resolve("granted" as NotificationPermission);
  }
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
