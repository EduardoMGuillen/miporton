"use client";

import { useFormStatus } from "react-dom";

export function ManualExitSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70"
    >
      {pending ? "Procesando salida..." : "Marcar salida manual"}
    </button>
  );
}
