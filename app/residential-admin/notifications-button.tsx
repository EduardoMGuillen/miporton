"use client";

import { useState } from "react";
import { enableWebPush, sendTestPush } from "@/lib/web-push-client";

export function ResidentialAdminNotificationsButton({ vapidPublicKey }: { vapidPublicKey?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "testing" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function subscribe() {
    setStatus("loading");
    setMessage("");
    const result = await enableWebPush(vapidPublicKey);
    if (result.ok) {
      setMessage(result.message || "Notificaciones activadas");
      setStatus("success");
      return;
    }
    setMessage(result.message);
    setStatus("error");
  }

  async function test() {
    setStatus("testing");
    setMessage("");
    const result = await sendTestPush();
    if (result.ok) {
      setMessage(result.message);
      setStatus("success");
      return;
    }
    setMessage(result.message);
    setStatus("error");
  }

  const busy = status === "loading" || status === "testing";

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void subscribe()}
          disabled={busy}
          className="btn-primary min-h-11 w-full touch-manipulation disabled:opacity-60 sm:w-auto"
        >
          {status === "loading" ? "Activando..." : "Activar notificaciones"}
        </button>
        <button
          type="button"
          onClick={() => void test()}
          disabled={busy}
          className="min-h-11 w-full touch-manipulation rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
        >
          {status === "testing" ? "Enviando..." : "Probar notificaciones"}
        </button>
      </div>
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
