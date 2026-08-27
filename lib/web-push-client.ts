"use client";

export type EnablePushFailureCode =
  | "unsupported"
  | "denied"
  | "missing_vapid"
  | "register_fail"
  | "sw_fail"
  | "ios_install"
  | "error";

export type EnablePushResult = { ok: true } | { ok: false; code: EnablePushFailureCode };

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const mediaStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const navigatorStandalone = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return mediaStandalone || navigatorStandalone;
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
  return Notification.requestPermission();
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
    const response = await fetch("/api/push/public-key", { credentials: "include" });
    if (!response.ok) return "";
    const data = (await response.json()) as { publicKey?: string };
    return data.publicKey?.trim() ?? "";
  } catch {
    return "";
  }
}

async function getActivePushRegistration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing?.active) {
    return existing;
  }

  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.ready;
  }

  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

async function subscribeWithKey(registration: ServiceWorkerRegistration, publicKey: string) {
  const keyBytes = urlBase64ToUint8Array(publicKey);
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes,
    });
  } catch {
    const stale = await registration.pushManager.getSubscription();
    if (stale) {
      await stale.unsubscribe();
    }
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes,
    });
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

    const permission = await (permissionPromise ?? requestNotificationPermissionFromGesture());
    if (permission !== "granted") {
      return { ok: false, code: "denied" };
    }

    const publicKey = await resolveVapidPublicKey(vapidPublicKey);
    if (!publicKey) {
      return { ok: false, code: "missing_vapid" };
    }

    let registration: ServiceWorkerRegistration;
    try {
      registration = await getActivePushRegistration();
    } catch {
      return { ok: false, code: "sw_fail" };
    }

    if (!registration.active) {
      return { ok: false, code: "sw_fail" };
    }

    const subscription = await subscribeWithKey(registration, publicKey);
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!response.ok) {
      return { ok: false, code: "register_fail" };
    }

    return { ok: true };
  } catch {
    return { ok: false, code: "error" };
  }
}
