"use client";

import { useState, type MouseEvent } from "react";
import {
  enableWebPush,
  requestNotificationPermissionFromGesture,
  type EnablePushFailureCode,
} from "@/lib/web-push-client";

const PUSH_ERROR_MESSAGES: Record<EnablePushFailureCode, string> = {
  unsupported: "Este navegador no soporta notificaciones push.",
  denied: "Debes permitir notificaciones para recibir alertas. Revisa Ajustes del telefono si ya las bloqueaste.",
  missing_vapid: "Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY.",
  register_fail: "No se pudo registrar el dispositivo en el servidor. Revisa tu conexion e intenta de nuevo.",
  sw_fail: "No se pudo activar el servicio de notificaciones. Cierra y vuelve a abrir la app, luego intenta de nuevo.",
  ios_install: "En iPhone, abre Safari, agrega MiVisita a inicio y activa las notificaciones desde la app instalada.",
  timeout: "La activacion tardo demasiado. Cierra la app, abrela de nuevo e intenta otra vez.",
  error: "Ocurrio un error activando las notificaciones.",
};

export function ResidentialAdminNotificationsButton({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "error" | null>(null);

  function onEnableClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const permissionPromise = requestNotificationPermissionFromGesture();
    setPending(true);
    setMessage("Activando...");
    setTone(null);
    void enableWebPush(vapidPublicKey, permissionPromise)
      .then((result) => {
        if (result.ok) {
          setTone("ok");
          setMessage("Notificaciones activadas. Debes ver un aviso de prueba.");
          return;
        }
        setTone("error");
        setMessage(PUSH_ERROR_MESSAGES[result.code]);
      })
      .catch(() => {
        setTone("error");
        setMessage(PUSH_ERROR_MESSAGES.error);
      })
      .finally(() => {
        setPending(false);
      });
  }

  return (
    <div>
      <button
        id="enable-push-notifications-admin"
        type="button"
        onClick={onEnableClick}
        disabled={pending}
        className="btn-primary min-h-11 w-full touch-manipulation disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Activando..." : "Activar notificaciones"}
      </button>
      {message ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-sm font-medium ${
            tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : tone === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
