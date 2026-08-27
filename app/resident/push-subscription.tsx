"use client";

import { useState, type MouseEvent } from "react";
import { InstallAppGuide } from "@/app/components/install-app-guide";
import { useResidentT } from "@/app/resident/resident-i18n-context";
import {
  enableWebPush,
  requestNotificationPermissionFromGesture,
  type EnablePushFailureCode,
} from "@/lib/web-push-client";

type PushSubscriptionCardProps = {
  vapidPublicKey?: string;
};

const PUSH_ERROR_KEYS: Record<EnablePushFailureCode, string> = {
  unsupported: "push.browserUnsupported",
  denied: "push.permissionDenied",
  missing_vapid: "push.missingVapid",
  register_fail: "push.registerFail",
  sw_fail: "push.swFailed",
  ios_install: "push.iosInstall",
  timeout: "push.timeout",
  error: "push.enableError",
};

export function PushSubscriptionCard({ vapidPublicKey }: PushSubscriptionCardProps) {
  const { t } = useResidentT();
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"ok" | "error" | null>(null);
  const [pending, setPending] = useState(false);
  const [showInstall, setShowInstall] = useState(false);

  function onEnableClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    // Must start in the same user-gesture turn as the tap.
    const permissionPromise = requestNotificationPermissionFromGesture();
    setPending(true);
    setMessage(t("push.enabling"));
    setTone(null);
    setShowInstall(false);

    void enableWebPush(vapidPublicKey, permissionPromise)
      .then((result) => {
        if (result.ok) {
          setTone("ok");
          setMessage(t("push.enabledOk"));
          return;
        }
        setTone("error");
        setMessage(t(PUSH_ERROR_KEYS[result.code]));
        setShowInstall(result.code === "ios_install");
      })
      .catch(() => {
        setTone("error");
        setMessage(t("push.enableError"));
      })
      .finally(() => {
        setPending(false);
      });
  }

  return (
    <div>
      <p className="text-sm text-slate-600">{t("push.help")}</p>
      <button
        id="enable-push-notifications"
        type="button"
        onClick={onEnableClick}
        disabled={pending}
        className="btn-primary mt-3 min-h-11 w-full touch-manipulation disabled:opacity-60 sm:w-auto"
      >
        {pending ? t("push.enabling") : t("push.enable")}
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
      {showInstall ? (
        <div className="mt-3">
          <InstallAppGuide />
        </div>
      ) : null}
    </div>
  );
}
