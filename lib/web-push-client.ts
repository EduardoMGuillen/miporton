"use client";

export type EnablePushFailureCode =
  | "unsupported"
  | "denied"
  | "missing_vapid"
  | "register_fail"
  | "sw_fail"
  | "ios_install"
  | "timeout"
  | "error";

export type EnablePushResult =
  | { ok: true }
  | { ok: false; code: EnablePushFailureCode; detail?: string };

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iphone|ipad|ipod/.test(ua) || iPadOs;
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const mediaFullscreen = window.matchMedia("(display-mode: fullscreen)").matches;
  const navigatorStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return mediaStandalone || mediaFullscreen || navigatorStandalone;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function requestNotificationPermissionFromGesture(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return Promise.resolve("denied");
  }
  if (Notification.permission === "granted") {
    return Promise.resolve("granted");
  }
  if (Notification.permission === "denied") {
    return Promise.resolve("denied");
  }
  try {
    return Notification.requestPermission();
  } catch {
    return Promise.resolve("denied");
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const trimmed = base64String.trim().replace(/\s+/g, "");
  const padding = "=".repeat((4 - (trimmed.length % 4)) % 4);
  const base64 = (trimmed + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function resolveVapidPublicKey(passed?: string) {
  const fromProp = passed?.trim();
  if (fromProp) return fromProp;

  const fromEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  if (fromEnv) return fromEnv;

  try {
    const response = await fetch("/api/push/public-key", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) return "";
    const data = (await response.json()) as { publicKey?: string };
    return data.publicKey?.trim() ?? "";
  } catch {
    return "";
  }
}

function waitForWorker(worker: ServiceWorker, timeoutMs = 10000) {
  if (worker.state === "activated") return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("sw-timeout")), timeoutMs);
    const onChange = () => {
      if (worker.state === "activated") {
        window.clearTimeout(timeout);
        worker.removeEventListener("statechange", onChange);
        resolve();
        return;
      }
      if (worker.state === "redundant") {
        window.clearTimeout(timeout);
        worker.removeEventListener("statechange", onChange);
        reject(new Error("sw-redundant"));
      }
    };
    worker.addEventListener("statechange", onChange);
  });
}

async function getActivePushRegistration() {
  let registration = await navigator.serviceWorker.getRegistration("/");

  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  } else {
    try {
      await registration.update();
    } catch {
      // update is best-effort; an already-active worker can still subscribe
    }
  }

  if (registration.active) return registration;

  const pending = registration.installing ?? registration.waiting;
  if (pending) {
    await waitForWorker(pending);
    if (registration.active) return registration;
  }

  return withTimeout(navigator.serviceWorker.ready, 10000, "ready-timeout");
}

async function subscribeWithKey(registration: ServiceWorkerRegistration, publicKey: string) {
  const keyBytes = urlBase64ToUint8Array(publicKey);
  if (keyBytes.byteLength !== 65) {
    throw new Error("vapid-key-invalid");
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    try {
      await existing.unsubscribe();
    } catch {
      // continue and try a fresh subscribe
    }
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes,
  });
}

async function showActivationSmokeTest(registration: ServiceWorkerRegistration) {
  try {
    await registration.showNotification("MiVisita", {
      body: "Notificaciones activadas en este dispositivo.",
      icon: "/icon-192.png",
      badge: "/icon-48.png",
      tag: "mivisita-push-enabled",
      data: { url: "/resident/ajustes" },
    });
  } catch {
    // Permission may allow push subscribe but block local smoke tests on some shells.
  }
}

export async function enableWebPush(
  vapidPublicKey?: string,
  permissionPromise?: Promise<NotificationPermission>,
): Promise<EnablePushResult> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      if (isIosDevice() && !isStandaloneDisplay()) {
        return { ok: false, code: "ios_install" };
      }
      return { ok: false, code: "unsupported" };
    }

    if (isIosDevice() && !isStandaloneDisplay()) {
      return { ok: false, code: "ios_install" };
    }

    const permission = await withTimeout(
      permissionPromise ?? requestNotificationPermissionFromGesture(),
      20000,
      "permission-timeout",
    );
    if (permission !== "granted") {
      return { ok: false, code: "denied" };
    }

    const publicKey = await withTimeout(resolveVapidPublicKey(vapidPublicKey), 10000, "vapid-timeout");
    if (!publicKey) {
      return { ok: false, code: "missing_vapid" };
    }

    let registration: ServiceWorkerRegistration;
    try {
      registration = await withTimeout(getActivePushRegistration(), 15000, "sw-timeout");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "sw_fail";
      return { ok: false, code: detail.includes("timeout") ? "timeout" : "sw_fail", detail };
    }

    if (!registration.active) {
      return { ok: false, code: "sw_fail", detail: "no-active-worker" };
    }

    let subscription: PushSubscription;
    try {
      subscription = await withTimeout(subscribeWithKey(registration, publicKey), 20000, "subscribe-timeout");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "subscribe_fail";
      return {
        ok: false,
        code: detail.includes("timeout") ? "timeout" : "error",
        detail,
      };
    }

    const response = await withTimeout(
      fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(subscription.toJSON()),
      }),
      15000,
      "register-timeout",
    );

    if (!response.ok) {
      return {
        ok: false,
        code: "register_fail",
        detail: `http-${response.status}`,
      };
    }

    await showActivationSmokeTest(registration);
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    if (detail.includes("timeout")) {
      return { ok: false, code: "timeout", detail };
    }
    return { ok: false, code: "error", detail };
  }
}
