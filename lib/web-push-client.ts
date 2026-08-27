"use client";

/**
 * Push VAPID:
 * - iOS: flujo que ya funciona (reusa suscripción, sin cambios agresivos)
 * - Android PWA/TWA: suscripción fresca + ArrayBuffer VAPID limpio + SW con control
 */

export type EnablePushResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; denied?: boolean; unsupported?: boolean };

export type TestPushResult =
  | { ok: true; message: string; sent?: number }
  | { ok: false; message: string };

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
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    Boolean(nav.standalone) ||
    // TWA / Android Browser Helper a veces no reporta display-mode standalone
    document.referrer.includes("android-app://")
  );
}

/** Chrome Android es exquisito: necesita ArrayBuffer exacto, no un Uint8Array “vista”. */
function vapidKeyToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer.slice(
    outputArray.byteOffset,
    outputArray.byteOffset + outputArray.byteLength,
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

/** En Android/TWA el SW debe controlar la página antes de subscribe. */
async function waitForServiceWorkerController(ms = 8000) {
  if (navigator.serviceWorker.controller) return;
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

async function ensureServiceWorker() {
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

  if (isAndroidDevice()) {
    // Si hay SW waiting, forzar activación (skipWaiting está en sw.js).
    if (reg.waiting) {
      reg.waiting.postMessage?.({ type: "SKIP_WAITING" });
    }
    await waitForServiceWorkerController(8000);
  }

  return reg;
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
      data: { url: "/" },
    });
    return true;
  } catch {
    return false;
  }
}

async function postSubscription(sub: PushSubscription) {
  const subscription = sub.toJSON();
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) {
    return {
      ok: false as const,
      message: "Suscripcion push invalida (keys vacias en el navegador).",
    };
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: { p256dh, auth },
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

async function subscribeFresh(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription> {
  const applicationServerKey = vapidKeyToArrayBuffer(vapidPublicKey);

  // Android: tirar suscripción vieja (a menudo rota tras experimentos FCM / dominio).
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      // seguir
    }
  }

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo suscribir a push");
}

async function subscribeIosOrDesktop(
  reg: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription> {
  const applicationServerKey = vapidKeyToArrayBuffer(vapidPublicKey);

  // iOS: reutilizar si existe (ya funciona).
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
      return await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch (e) {
      lastError = e;
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
        const reg = await ensureServiceWorker();
        localOk = await showLocalNotification(
          reg,
          "MiVisita — Prueba local",
          "Permiso y service worker OK en este telefono.",
          "mivisita-push-test-local",
        );
      } catch {
        // continuar
      }
    }

    const res = await fetch("/api/push/test", {
      method: "POST",
      credentials: "same-origin",
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      message?: string;
      sent?: number;
    };

    if (!res.ok) {
      const hintAndroid = isAndroidDevice()
        ? " En Android: pulsa Activar otra vez (crea suscripcion nueva) y vuelve a Probar."
        : "";
      return {
        ok: false,
        message:
          (data.error || data.message || "El push del servidor fallo.") +
          (localOk ? " (Prueba local OK.)" : "") +
          hintAndroid,
      };
    }

    return {
      ok: true,
      sent: data.sent,
      message:
        data.message ||
        "Push del servidor enviado. Minimiza la app y revisa la bandeja del sistema.",
    };
  } catch (err: unknown) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Error al probar notificaciones.",
    };
  }
}

export async function enableWebPush(vapidPublicKey?: string): Promise<EnablePushResult> {
  // —— iOS: mismas reglas que ya funcionan ——
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
        : "Permiso denegado. Activa notificaciones en Ajustes → Apps → Chrome o MiVisita.",
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
              : "Permiso denegado. Activa notificaciones en Ajustes del dispositivo."
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

    let publicKey = vapidPublicKey?.trim() || "";
    if (!publicKey) {
      const vapidRes = await fetch("/api/push/public-key", { cache: "no-store" });
      if (!vapidRes.ok) return { ok: false, message: "Push no disponible (servidor)" };
      const data = (await vapidRes.json()) as { publicKey?: string };
      publicKey = data.publicKey?.trim() || "";
    }
    if (!publicKey) return { ok: false, message: "Clave VAPID vacia" };

    const android = isAndroidDevice();
    const sub = android
      ? await subscribeFresh(reg, publicKey)
      : await subscribeIosOrDesktop(reg, publicKey);

    const saved = await postSubscription(sub);
    if (!saved.ok) return saved;

    await showLocalNotification(
      reg,
      "MiVisita",
      "Notificaciones activadas en este dispositivo.",
      "mivisita-push-enabled",
    );

    // Android: verificar envío real; si falla, una segunda suscripción limpia.
    if (android) {
      const testRes = await fetch("/api/push/test", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!testRes.ok) {
        try {
          const again = await subscribeFresh(reg, publicKey);
          const savedAgain = await postSubscription(again);
          if (savedAgain.ok) {
            await fetch("/api/push/test", {
              method: "POST",
              credentials: "same-origin",
            }).catch(() => null);
          }
        } catch {
          // ya quedó guardada la primera; el usuario puede Probar
        }
      }
    }

    return {
      ok: true,
      message: android
        ? "Notificaciones activadas en Android. Minimiza la app y pulsa Probar si no viste el push."
        : "Notificaciones activadas. Si no ves el aviso, pulsa Probar notificaciones.",
    };
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
          " Prueba: 1) Abrir desde icono PWA/APK 2) WiFi 3) Actualizar Chrome y Google Play Services 4) Ajustes → Apps → Chrome/MiVisita → Notificaciones ON 5) Reintentar Activar.";
      } else {
        hint =
          " En Android abre desde el icono de la PWA o el APK (TWA), no solo una pestana de Chrome.";
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
