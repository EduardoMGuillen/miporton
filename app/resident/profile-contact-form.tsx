"use client";

import { useActionState } from "react";
import { updateResidentContactAction } from "@/app/resident/actions";
import { useResidentT } from "@/app/resident/resident-i18n-context";

const initialState: string | null = null;

export function ProfileContactForm({
  initialPersonalEmail,
  initialPhoneNumber,
}: {
  initialPersonalEmail: string;
  initialPhoneNumber: string;
}) {
  const { t } = useResidentT();
  const [message, formAction, isPending] = useActionState(updateResidentContactAction, initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div>
        <label htmlFor="profile-personal-email" className="mb-1 block text-xs font-semibold text-slate-600">
          {t("profile.personalEmail")}
        </label>
        <input
          id="profile-personal-email"
          name="personalEmail"
          type="email"
          defaultValue={initialPersonalEmail}
          className="field-base"
          placeholder={t("contact.personalPlaceholder")}
          autoComplete="email"
        />
      </div>
      <div>
        <label htmlFor="profile-phone" className="mb-1 block text-xs font-semibold text-slate-600">
          {t("profile.phone")}
        </label>
        <input
          id="profile-phone"
          name="phoneNumber"
          type="tel"
          defaultValue={initialPhoneNumber}
          className="field-base"
          placeholder={t("contact.phonePlaceholder")}
          autoComplete="tel"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-max disabled:opacity-60"
      >
        {isPending ? t("contact.saving") : t("contact.save")}
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
