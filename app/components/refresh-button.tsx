"use client";

import { useRouter } from "next/navigation";

export function RefreshButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 transition hover:bg-slate-50"
      title="Actualizar vista"
      aria-label="Actualizar vista"
    >
      Refresh
    </button>
  );
}
