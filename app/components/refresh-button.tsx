"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton({
  className,
  idleLabel = "Actualizar",
  pendingLabel = "Actualizando...",
  title = "Actualizar vista",
  ariaLabel = "Actualizar vista",
}: {
  className?: string;
  idleLabel?: string;
  pendingLabel?: string;
  title?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
      disabled={isPending}
      className={`rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 ${className ?? ""}`}
      title={title}
      aria-label={ariaLabel}
    >
      {isPending ? pendingLabel : idleLabel}
    </button>
  );
}
