"use client";

import type { FormEvent } from "react";
import { revokeAdminQrAction } from "@/app/residential-admin/actions";

export function RevokeAdminQrButton({ qrId }: { qrId: string }) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const accepted = window.confirm("¿Seguro que deseas eliminar este QR? Dejara de funcionar inmediatamente.");
    if (!accepted) {
      event.preventDefault();
    }
  };

  return (
    <form action={revokeAdminQrAction} className="mt-2" onSubmit={handleSubmit}>
      <input type="hidden" name="qrId" value={qrId} />
      <button
        type="submit"
        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
      >
        Eliminar QR
      </button>
    </form>
  );
}
