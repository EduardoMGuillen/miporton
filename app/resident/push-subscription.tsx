"use client";

import { useState } from "react";
import { useResidentT } from "@/app/resident/resident-i18n-context";
import { enableWebPush, sendTestPush } from "@/lib/web-push-client";

type PushSubscriptionCardProps = {
  vapidPublicKey?: string;
};

export function PushSubscriptionCard({ vapidPublicKey }: PushSubscriptionCardProps) {
  const { t } = useResidentT();
  const [status, setStatus] = useState<"idle" | "loading" | "testing" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function subscribe() {
    setStatus("loading");
    setMessage("");
    try {
      const result = await enableWebPush(vapidPublicKey);
      if (result.ok) {
        setMessage(result.message || t("push.enabledOk"));
        setStatus("success");
        return;
      }
      setMessage(result.message);
      setStatus("error");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : t("push.enableError"));
      setStatus("error");
    }
  }

  async function test() {
    setStatus("testing");
    setMessage("");
    try {
      const result = await sendTestPush();
      if (result.ok) {
        setMessage(result.message);
        setStatus("success");
        return;
      }
      setMessage(result.message);
      setStatus("error");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Error al probar.");
      setStatus("error");
    }
  }

  const busy = status === "loading" || status === "testing";

  return (
    <div>
      <p className="text-sm text-slate-600">{t("push.help")}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void subscribe()}
          disabled={busy}
          className="btn-primary min-h-11 w-full touch-manipulation disabled:opacity-60 sm:w-auto"
        >
          {status === "loading" ? t("push.enabling") : t("push.enable")}
        </button>
        <button
          type="button"
          onClick={() => void test()}
          disabled={busy}
          className="min-h-11 w-full touch-manipulation rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
        >
          {status === "testing" ? t("push.testing") : t("push.test")}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-3 rounded-xl border px-3 py-2 text-sm font-medium ${
            status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : status === "error"
                ? "border-red-200 bg-red-50 text-red-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
