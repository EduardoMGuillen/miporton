"use client";

import { useActionState, useState } from "react";
import { updateResidentContactAction } from "@/app/resident/actions";

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

const initialContactState: string | null = null;

type PushSubscriptionCardProps = {
  initialPersonalEmail: string;
  initialPhoneNumber: string;
};

export function PushSubscriptionCard({
  initialPersonalEmail,
  initialPhoneNumber,
}: PushSubscriptionCardProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, contactFormAction, isSavingContact] = useActionState(
    updateResidentContactAction,
    initialContactState,
  );

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

      setMessage("Notificaciones activadas correctamente.");
    } catch {
      setMessage("Ocurrio un error activando las notificaciones.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-card p-5 md:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Notificaciones push</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={enablePush}
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? "Activando..." : "Activar notificaciones"}
        </button>
        <button
          type="button"
          onClick={() => setShowContactForm((value) => !value)}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          Datos de Contacto
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
      {showContactForm ? (
        <form action={contactFormAction} className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            name="personalEmail"
            type="email"
            defaultValue={initialPersonalEmail}
            className="field-base"
            placeholder="Correo personal (opcional)"
          />
          <input
            name="phoneNumber"
            defaultValue={initialPhoneNumber}
            className="field-base"
            placeholder="Telefono personal (opcional)"
          />
          <button
            type="submit"
            disabled={isSavingContact}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            {isSavingContact ? "Guardando..." : "Guardar datos de contacto"}
          </button>
          {contactMessage ? <p className="text-sm text-slate-700">{contactMessage}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
