"use client";

/**
 * Activación push:
 * - Primario: Web Push VAPID (iOS PWA, Android Chrome/PWA, desktop)
 * - Opcional Android: FCM adicional si hay Firebase web config (no reemplaza VAPID)
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
  "iOS ya bloqueó las notificaciones de MiVisita (aunque estés en la PWA; un No permitir anterior queda guardado). Para resetear: 1) Ajustes → Notificaciones → busca MiVisita → permitir. Si no aparece o sigue fallando: 2) Borra el icono de Inicio. 3) Ajustes → Apps → Safari → Avanzado → Datos de sitios web → elimina mivisita / mivisita.app. 4) Safari → Agregar a Inicio. 5) Abre desde el icono nuevo → Activar notificaciones → Permitir.";

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

async function ensureServiceWorker() {
  let reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg || !reg.active) {
    reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } else {
    try {
      await reg.update();
    } catch {
      // best-effort
    }
  }
  const swWorker = reg.installing || reg.waiting || reg.active;
  await waitUntilActivated(swWorker);
  await navigator.serviceWorker.ready;
  return reg;
}

async function fetchVapidPublicKey(passed?: string) {
  const fromProp = passed?.trim();
  if (fromProp) return fromProp;
  const vapidRes = await fetch("/api/push/public-key", { cache: "no-store" });
  if (!vapidRes.ok) return "";
  const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
  return publicKey?.trim() || "";
}

async function showLocalSmokeTest(reg: ServiceWorkerRegistration) {
  try {
    await reg.showNotification("MiVisita", {
      body: "Notificaciones activadas en este dispositivo.",
      icon: "/icon-192.png",
      badge: "/icon-48.png",
      tag: "mivisita-push-enabled",
      data: { url: "/" },
    });
  } catch {
    // Algunos shells bloquean showNotification local aunque push esté OK.
  }
}

async function postWebSubscription(subscription: PushSubscriptionJSON) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
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
    return {
      ok: false as const,
      message: (err as { error?: string }).error || "Error al registrar",
    };
  }
  return { ok: true as const };
}

/** FCM opcional en Android: se suma a VAPID, no lo sustituye. */
async function tryRegisterAndroidFcmOptional(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<void> {
  if (!isAndroidDevice()) return;
  try {
    const { getFirebaseWebConfig } = await import("@/lib/firebase-web-config");
    const firebaseWebConfig = getFirebaseWebConfig();
    if (!firebaseWebConfig) return;

    const { getApp, initializeApp } = await import("firebase/app");
    const { getMessaging, getToken } = await import("firebase/messaging");
    let app;
    try {
      app = getApp();
    } catch {
      app = initializeApp(firebaseWebConfig);
    }
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: vapidPublicKey,
      serviceWorkerRegistration: reg,
    });
    if (!token) return;

    await fetch("/api/push/subscribe", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "android", token }),
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("[push] FCM Android opcional omitido:", errMsg);
  }
}

async function subscribeWebVapid(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<EnablePushResult> {
  const key = urlBase64ToUint8Array(vapidPublicKey);

  // Reutilizar suscripción existente (resync). Evita unsubscribe+subscribe que
  // en Chrome Android suele fallar con "Registration failed - push service error".
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const maxRetries = 3;
    let lastError: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key as BufferSource,
        });
        break;
      } catch (e) {
        lastError = e;
        if (attempt === maxRetries - 1) throw e;
      }
    }
  }

  if (!sub) {
    return { ok: false, message: "No se pudo suscribir a push" };
  }

  const saved = await postWebSubscription(sub.toJSON());
  if (!saved.ok) return saved;

  // Canal extra en Android si Firebase está configurado (no bloquea el éxito VAPID).
  // Tras getToken, re-sincronizar la suscripción web por si el PushManager cambió keys.
  await tryRegisterAndroidFcmOptional(reg, vapidPublicKey);
  const afterFcm = await reg.pushManager.getSubscription();
  if (afterFcm) {
    await postWebSubscription(afterFcm.toJSON());
  }

  await showLocalSmokeTest(reg);
  const test = await sendTestPush();
  if (test.ok) {
    return {
      ok: true,
      message: "Notificaciones activadas. Deberías ver una de prueba ahora.",
    };
  }
  return {
    ok: true,
    message:
      "Suscripción guardada, pero la prueba de push falló: " +
      test.message +
      " Pulsa «Probar notificaciones» o reintenta en unos segundos.",
  };
}

export async function sendTestPush(): Promise<TestPushResult> {
  try {
    const res = await fetch("/api/push/test", {
      method: "POST",
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      sent?: number;
      total?: number;
    };
    if (!res.ok) {
      return {
        ok: false,
        message: data.error || data.message || "No se pudo enviar la notificación de prueba.",
      };
    }
    if (typeof data.sent === "number" && data.sent <= 0) {
      return {
        ok: false,
        message:
          data.message ||
          "No hay suscripción activa en el servidor. Pulsa Activar notificaciones primero.",
      };
    }
    return {
      ok: true,
      sent: data.sent,
      message: data.message || "Notificación de prueba enviada. Revisa la bandeja del sistema.",
    };
  } catch {
    return { ok: false, message: "Error de red al probar notificaciones." };
  }
}

export async function enableWebPush(vapidPublicKey?: string): Promise<EnablePushResult> {
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
        : "Tu navegador no soporta notificaciones. Usa Chrome en el movil y anade la web a pantalla de inicio.",
    };
  }

  if (Notification.permission === "denied") {
    return {
      ok: false,
      denied: true,
      message: isIosDevice()
        ? IOS_DENIED_RESET_MESSAGE
        : "Permiso denegado. En Android: Ajustes → Apps → Chrome (o MiVisita) → Notificaciones → permitir. Luego vuelve a pulsar Activar.",
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
              : "Permiso denegado. En Android: Ajustes → Apps → Chrome (o MiVisita) → Notificaciones → permitir."
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
        : "Tu navegador no soporta notificaciones push. Usa Chrome (PWA o APK) y permite notificaciones.",
    };
  }

  try {
    const reg = await ensureServiceWorker();
    const publicKey = await fetchVapidPublicKey(vapidPublicKey);
    if (!publicKey) return { ok: false, message: "Push no disponible (servidor / clave VAPID)" };

    // VAPID primero en todas las plataformas (incluye Android). FCM es opcional extra.
    return await subscribeWebVapid(reg, publicKey);
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
          " Prueba: 1) Abrir desde el icono PWA o APK 2) WiFi 3) Actualizar Chrome y Google Play Services 4) Ajustes → Apps → Chrome/MiVisita → Notificaciones ON 5) Reintentar.";
      } else {
        hint =
          " En Android: abre desde la PWA o el APK, no desde una pestaña normal. Revisa notificaciones en Ajustes del sistema.";
      }
    }
    return { ok: false, message: errMsg + hint };
  }
}

/** @deprecated alias — el botón pide permiso dentro de enableWebPush */
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
