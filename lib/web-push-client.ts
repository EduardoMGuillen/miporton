"use client";

/**
 * Flujo de activación push que YA funcionaba (gcbmesas + iOS PWA):
 * permiso → SW → pushManager.subscribe → POST /api/push/subscribe
 * Sin FCM, sin timeouts agresivos (rompían Android PWA/TWA).
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

function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // Chrome Android TWA / standalone display
    window.matchMedia("(display-mode: minimal-ui)").matches ||
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
  }
  const swWorker = reg.installing || reg.waiting || reg.active;
  await waitUntilActivated(swWorker);
  await navigator.serviceWorker.ready;
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
        // continuar con servidor
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
      return {
        ok: false,
        message:
          (data.error || data.message || "El push del servidor fallo.") +
          (localOk
            ? " (La prueba local si se mostro; vuelve a Activar y reintenta Probar.)"
            : ""),
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
        : "Permiso denegado. Activa notificaciones en Ajustes del sitio o dispositivo.",
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
              : "Permiso denegado. Activa notificaciones en Ajustes del sitio o dispositivo."
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
        : "Tu navegador no soporta notificaciones push. Usa Chrome en el movil (y anade la web a pantalla de inicio) para recibirlas.",
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

    const key = urlBase64ToUint8Array(publicKey);

    // Reusar suscripcion existente si hay (reactivar / resync).
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const maxRetries = 3;
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
    }

    if (!sub) return { ok: false, message: "No se pudo suscribir a push" };

    const subscription = sub.toJSON();
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;
    if (!subscription.endpoint || !p256dh || !auth) {
      return { ok: false, message: "Suscripcion push invalida (keys vacias en el navegador)." };
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
        ok: false,
        message: (err as { error?: string }).error || "Error al registrar",
      };
    }

    await showLocalNotification(
      reg,
      "MiVisita",
      "Notificaciones activadas en este dispositivo.",
      "mivisita-push-enabled",
    );

    return {
      ok: true,
      message: "Notificaciones activadas. Si no ves el aviso, pulsa Probar notificaciones.",
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isPushServiceError = /push service|Registration failed.*push/i.test(errMsg);

    let hint = "";
    if (isIosDevice()) {
      hint =
        " Si sigue fallando: borra el icono, limpia datos del sitio en Safari y vuelve a agregar a Inicio.";
    } else if (isAndroid) {
      if (isPushServiceError) {
        hint =
          " Prueba: 1) Abrir desde icono PWA/APK 2) WiFi 3) Actualizar Chrome 4) Reintentar.";
      } else {
        hint =
          " En Android: abre desde el icono de la PWA o el APK. Revisa que las notificaciones esten permitidas.";
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
