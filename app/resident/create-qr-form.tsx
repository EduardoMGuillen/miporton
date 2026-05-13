"use client";

import { useActionState } from "react";
import { createInviteQrAction } from "@/app/resident/actions";
import { useResidentT } from "@/app/resident/resident-i18n-context";

const initialState: string | null = null;

type ValidityType = "SINGLE_USE" | "ONE_DAY" | "THREE_DAYS" | "INFINITE";

const VALIDITY_KEYS: Record<ValidityType, string> = {
  SINGLE_USE: "invite.validitySingle",
  ONE_DAY: "invite.validityOneDay",
  THREE_DAYS: "invite.validityThreeDays",
  INFINITE: "invite.validityInfinite",
};

export function CreateQrForm({ allowedValidityTypes }: { allowedValidityTypes: ValidityType[] }) {
  const { t } = useResidentT();
  const [message, formAction, isPending] = useActionState(createInviteQrAction, initialState);
  const options: ValidityType[] =
    allowedValidityTypes.length > 0 ? allowedValidityTypes : ["SINGLE_USE"];
  const hasAllowedValidity = allowedValidityTypes.length > 0;

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input
        name="visitorName"
        required
        placeholder={t("invite.visitorPlaceholder")}
        className="field-base"
      />
      <select
        name="validityType"
        defaultValue={options[0]}
        className="field-base"
        disabled={!hasAllowedValidity}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {t(VALIDITY_KEYS[option])}
          </option>
        ))}
      </select>
      <input
        name="description"
        placeholder={t("invite.descPlaceholder")}
        className="field-base md:col-span-2"
        maxLength={180}
      />
      <select name="hasVehicle" defaultValue="no" className="field-base">
        <option value="no">{t("invite.peaton")}</option>
        <option value="yes">{t("invite.vehicle")}</option>
      </select>
      <button
        type="submit"
        disabled={isPending || !hasAllowedValidity}
        className="btn-primary disabled:opacity-60 md:col-span-2 md:w-max"
      >
        {isPending ? t("invite.generating") : t("invite.generate")}
      </button>
      {!hasAllowedValidity ? (
        <p className="text-sm text-amber-700 md:col-span-2">{t("invite.adminDisabled")}</p>
      ) : null}
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
