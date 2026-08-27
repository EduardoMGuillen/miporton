"use client";

import { useState } from "react";
import { enableWebPush } from "@/lib/web-push-client";

export function GuardPushSubscriptionCard({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function subscribe() {
    setStatus("loading");
    setMessage("");
    const result = await enableWebPush(vapidPublicKey);
    if (result.ok) {
      setMessage("Notificaciones activadas");
      setStatus("success");
      return;
    }
    setMessage(result.message);
    setStatus("error");
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <p className="text-sm font-semibold text-blue-900">Alertas para guardia</p>
      <p className="mt-1 text-xs text-blue-800">
        Activa push para recibir aviso cuando un residente anuncie una visita.
      </p>
      <button
        type="button"
        onClick={() => void subscribe()}
        disabled={status === "loading"}
        className="mt-3 min-h-11 w-full touch-manipulation rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Activando..." : "Activar alertas"}
      </button>
      {message ? (
        <p
          className={`mt-2 rounded-lg border px-2.5 py-2 text-xs font-medium ${
            status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
