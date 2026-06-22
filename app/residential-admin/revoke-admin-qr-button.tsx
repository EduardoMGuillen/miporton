"use client";

import type { FormEvent } from "react";
import { revokeAdminQrAction } from "@/app/residential-admin/actions";

type RevokeQrAction = typeof revokeAdminQrAction;

export function RevokeQrButton({
  qrId,
  action = revokeAdminQrAction,
  label = "Eliminar QR",
  confirmMessage = "¿Seguro que deseas eliminar este QR? Dejara de funcionar inmediatamente.",
}: {
  qrId: string;
  action?: RevokeQrAction;
  label?: string;
  confirmMessage?: string;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const accepted = window.confirm(confirmMessage);
    if (!accepted) {
      event.preventDefault();
    }
  };

  return (
    <form action={action} className="mt-2" onSubmit={handleSubmit}>
      <input type="hidden" name="qrId" value={qrId} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
      >
        {label}
      </button>
    </form>
  );
}

/** @deprecated Use RevokeQrButton */
export function RevokeAdminQrButton({ qrId }: { qrId: string }) {
  return <RevokeQrButton qrId={qrId} />;
}
