"use client";

import { useState } from "react";
import { useResidentT } from "@/app/resident/resident-i18n-context";
import { enableWebPush } from "@/lib/web-push-client";

type PushSubscriptionCardProps = {
  vapidPublicKey?: string;
};

export function PushSubscriptionCard({ vapidPublicKey }: PushSubscriptionCardProps) {
  const { t } = useResidentT();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function subscribe() {
    setStatus("loading");
    setMessage("");
    const result = await enableWebPush(vapidPublicKey);
    if (result.ok) {
      setMessage(t("push.enabledOk"));
      setStatus("success");
      return;
    }
    setMessage(result.message);
    setStatus("error");
  }

  return (
    <div>
      <p className="text-sm text-slate-600">{t("push.help")}</p>
      <button
        type="button"
        onClick={() => void subscribe()}
        disabled={status === "loading"}
        className="btn-primary mt-3 min-h-11 w-full touch-manipulation disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? t("push.enabling") : t("push.enable")}
      </button>
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
