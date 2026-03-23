"use client";

import { useFormStatus } from "react-dom";

export function LogoutSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? "Cerrando sesion..." : "Cerrar sesion"}
    </button>
  );
}
