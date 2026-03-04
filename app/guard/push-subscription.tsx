"use client";

import { useState } from "react";

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function GuardPushSubscriptionCard() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function enablePush() {
    setPending(true);
    setMessage(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage("Este navegador no soporta notificaciones push.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Debes permitir notificaciones para recibir alertas.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        setMessage("Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicVapidKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        setMessage("No se pudo registrar el dispositivo.");
        return;
      }

      setMessage("Notificaciones activadas para anuncios de visitas.");
    } catch {
      setMessage("Ocurrio un error activando las notificaciones.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900">Alertas para guardia</p>
      <p className="mt-1 text-xs text-blue-800">
        Activa push para recibir aviso cuando un residente anuncie una visita.
      </p>
      <button
        onClick={enablePush}
        disabled={pending}
        className="mt-3 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
      >
        {pending ? "Activando..." : "Activar alertas"}
      </button>
      {message ? <p className="mt-2 text-xs text-blue-900">{message}</p> : null}
    </div>
  );
}
