"use client";

import { useFormStatus } from "react-dom";

export function LogoutSubmitButton({
  className,
  idleLabel = "Cerrar sesion",
  pendingLabel = "Cerrando sesion...",
  confirmMessage = "¿Seguro que quieres cerrar sesion?",
  ariaLabel = "Cerrar sesion",
}: {
  className?: string;
  idleLabel?: string;
  pendingLabel?: string;
  confirmMessage?: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel}
      className={`rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 ${className ?? ""}`}
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
