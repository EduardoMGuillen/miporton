"use client";

/**
 * Activación push:
 * - iPhone: solo PWA instalada + VAPID
 * - Android: FCM si hay Firebase web config (como gcbmesas); si no, VAPID reforzado
 * - Desktop: VAPID
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

async function sendServerTestPush() {
  try {
    await fetch("/api/push/test", { method: "POST", credentials: "same-origin" });
  } catch {
    // La suscripción ya quedó; el test es best-effort.
  }
}

async function subscribeAndroidFcm(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<EnablePushResult | null> {
  const { getFirebaseWebConfig } = await import("@/lib/firebase-web-config");
  const firebaseWebConfig = getFirebaseWebConfig();
  if (!firebaseWebConfig) return null;

  try {
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
    if (!token) return { ok: false, message: "No se obtuvo token FCM" };

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "android", token }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { ok: false, message: (err as { error?: string }).error || "Error al registrar FCM" };
    }

    await showLocalSmokeTest(reg);
    await sendServerTestPush();
    return { ok: true };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Si FCM falla, el caller puede caer a VAPID.
    console.warn("[push] FCM Android falló, se intenta VAPID:", errMsg);
    return null;
  }
}

async function subscribeWebVapid(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<EnablePushResult> {
  const key = urlBase64ToUint8Array(vapidPublicKey);

  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      // continuar con subscribe fresco
    }
  }

  const maxRetries = 3;
  let sub: PushSubscription | null = null;
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

  if (!sub) {
    throw lastError instanceof Error ? lastError : new Error("No se pudo suscribir a push");
  }

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

  await showLocalSmokeTest(reg);
  await sendServerTestPush();
  return { ok: true };
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

    if (isAndroidDevice()) {
      const fcmResult = await subscribeAndroidFcm(reg, publicKey);
      if (fcmResult) return fcmResult;
    }

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
