"use client";

import { useState, type MouseEvent } from "react";
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
  error: "push.enableError",
};

export function PushSubscriptionCard({ vapidPublicKey }: PushSubscriptionCardProps) {
  const { t } = useResidentT();
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
        setMessage(result.ok ? t("push.enabledOk") : t(PUSH_ERROR_KEYS[result.code]));
      })
      .finally(() => {
        setPending(false);
      });
  }

  return (
    <div>
      <p className="text-sm text-slate-600">{t("push.help")}</p>
      <button
        type="button"
        onClick={onEnableClick}
        disabled={pending}
        className="btn-primary mt-3 w-full touch-manipulation disabled:opacity-60 sm:w-auto"
      >
        {pending ? t("push.enabling") : t("push.enable")}
      </button>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
    </div>
  );
}
