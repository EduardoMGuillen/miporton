"use client";

import { useActionState, useState } from "react";
import { updateResidentContactAction } from "@/app/resident/actions";
import { useResidentT } from "@/app/resident/resident-i18n-context";

function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; ++i) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

const initialContactState: string | null = null;

type PushSubscriptionCardProps = {
  initialPersonalEmail: string;
  initialPhoneNumber: string;
};

export function PushSubscriptionCard({
  initialPersonalEmail,
  initialPhoneNumber,
}: PushSubscriptionCardProps) {
  const { t } = useResidentT();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactMessage, contactFormAction, isSavingContact] = useActionState(
    updateResidentContactAction,
    initialContactState,
  );

  async function enablePush() {
    setPending(true);
    setMessage(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setMessage(t("push.browserUnsupported"));
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(t("push.permissionDenied"));
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        setMessage(t("push.missingVapid"));
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicVapidKey),
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        setMessage(t("push.registerFail"));
        return;
      }

      setMessage(t("push.enabledOk"));
    } catch {
      setMessage(t("push.enableError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="surface-card p-5 md:p-6">
      <h2 className="text-lg font-semibold text-slate-900">{t("push.accountHeading")}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={enablePush}
          disabled={pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? t("push.enabling") : t("push.enable")}
        </button>
        <button
          type="button"
          onClick={() => setShowContactForm((value) => !value)}
          className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          {t("push.contactToggle")}
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
      {showContactForm ? (
        <form action={contactFormAction} className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            name="personalEmail"
            type="email"
            defaultValue={initialPersonalEmail}
            className="field-base"
            placeholder={t("contact.personalPlaceholder")}
          />
          <input
            name="phoneNumber"
            defaultValue={initialPhoneNumber}
            className="field-base"
            placeholder={t("contact.phonePlaceholder")}
          />
          <button
            type="submit"
            disabled={isSavingContact}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            {isSavingContact ? t("push.savingContact") : t("push.saveContact")}
          </button>
          {contactMessage ? <p className="text-sm text-slate-700">{contactMessage}</p> : null}
        </form>
      ) : null}
    </div>
  );
}
