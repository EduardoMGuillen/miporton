"use client";

import { useActionState, useState } from "react";
import { updateResidentContactAction } from "@/app/resident/actions";
import { useResidentT } from "@/app/resident/resident-i18n-context";
import { enableWebPush, type EnablePushFailureCode } from "@/lib/web-push-client";

const initialContactState: string | null = null;

type PushSubscriptionCardProps = {
  initialPersonalEmail: string;
  initialPhoneNumber: string;
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

export function PushSubscriptionCard({
  initialPersonalEmail,
  initialPhoneNumber,
  vapidPublicKey,
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
      const result = await enableWebPush(vapidPublicKey);
      setMessage(result.ok ? t("push.enabledOk") : t(PUSH_ERROR_KEYS[result.code]));
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
          onClick={() => void enablePush()}
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
