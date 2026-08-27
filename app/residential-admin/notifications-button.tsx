"use client";

import { useState } from "react";
import { enableWebPush, type EnablePushFailureCode } from "@/lib/web-push-client";

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

  async function enablePush() {
    setPending(true);
    setMessage(null);
    try {
      const result = await enableWebPush(vapidPublicKey);
      setMessage(result.ok ? "Notificaciones activadas correctamente." : PUSH_ERROR_MESSAGES[result.code]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void enablePush()}
        disabled={pending}
        className="btn-primary disabled:opacity-60"
      >
        {pending ? "Activando..." : "Activar notificaciones"}
      </button>
      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
