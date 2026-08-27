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

export function ResidentialAdminNotificationsButton({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function onEnableClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const permissionPromise = requestNotificationPermissionFromGesture();
    setPending(true);
    setMessage(null);
    void enableWebPush(vapidPublicKey, permissionPromise)
      .then((result) => {
        setMessage(result.ok ? "Notificaciones activadas correctamente." : PUSH_ERROR_MESSAGES[result.code]);
      })
      .finally(() => {
        setPending(false);
      });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onEnableClick}
        disabled={pending}
        className="btn-primary w-full touch-manipulation disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Activando..." : "Activar notificaciones"}
      </button>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
