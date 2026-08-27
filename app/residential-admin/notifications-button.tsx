"use client";

import { useState } from "react";
import { enableWebPush } from "@/lib/web-push-client";

export function ResidentialAdminNotificationsButton({ vapidPublicKey }: { vapidPublicKey?: string }) {
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
    <div>
      <button
        type="button"
        onClick={() => void subscribe()}
        disabled={status === "loading"}
        className="btn-primary min-h-11 w-full touch-manipulation disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Activando..." : "Activar notificaciones"}
      </button>
      {message ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-sm font-medium ${
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
