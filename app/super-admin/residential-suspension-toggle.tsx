"use client";

import { toggleResidentialSuspensionAction } from "@/app/super-admin/actions";

export function ResidentialSuspensionToggle({
  residentialId,
  residentialName,
  isSuspended,
}: {
  residentialId: string;
  residentialName: string;
  isSuspended: boolean;
}) {
  return (
    <form
      action={toggleResidentialSuspensionAction}
      className="mt-3"
      onSubmit={(event) => {
        const actionText = isSuspended ? "activar" : "suspender";
        const confirmed = window.confirm(
          `Confirma que deseas ${actionText} temporalmente la residencial ${residentialName}.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="residentialId" value={residentialId} />
      <input type="hidden" name="nextStatus" value={isSuspended ? "activate" : "suspend"} />
      <button
        className={
          isSuspended
            ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
        }
      >
        {isSuspended ? "Reactivar residencial" : "Suspender temporalmente"}
      </button>
    </form>
  );
}
