"use client";

import { useState, type MouseEvent } from "react";
import {
  enableWebPush,
  requestNotificationPermissionFromGesture,
  type EnablePushFailureCode,
} from "@/lib/web-push-client";

const PUSH_ERROR_MESSAGES: Record<EnablePushFailureCode, string> = {
  unsupported: "Este navegador no soporta notificaciones push.",
  denied: "Debes permitir notificaciones para recibir alertas.",
  missing_vapid: "Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
  register_fail: "No se pudo registrar el dispositivo.",
  sw_fail: "No se pudo activar el servicio de notificaciones. Recarga la pagina e intenta de nuevo.",
  ios_install: "En iPhone, agrega MiVisita a inicio para activar notificaciones.",
  error: "Ocurrio un error activando las notificaciones.",
};

export function GuardPushSubscriptionCard({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onEnableClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const permissionPromise = requestNotificationPermissionFromGesture();
    setPending(true);
    setMessage(null);
    void enableWebPush(vapidPublicKey, permissionPromise)
      .then((result) => {
        setMessage(result.ok ? "Notificaciones activadas para anuncios de visitas." : PUSH_ERROR_MESSAGES[result.code]);
      })
      .finally(() => {
        setPending(false);
      });
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900">Alertas para guardia</p>
      <p className="mt-1 text-xs text-blue-800">
        Activa push para recibir aviso cuando un residente anuncie una visita.
      </p>
      <button
        type="button"
        onClick={onEnableClick}
        disabled={pending}
        className="mt-3 w-full touch-manipulation rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Activando..." : "Activar alertas"}
      </button>
      {message ? <p className="mt-2 text-xs text-blue-900">{message}</p> : null}
    </div>
  );
}
