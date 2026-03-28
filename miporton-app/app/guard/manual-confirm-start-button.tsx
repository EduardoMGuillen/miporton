"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManualConfirmStartButton({ code }: { code: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setIsLoading(true);
        router.push(`/guard?manualCode=${encodeURIComponent(`MP:${code}`)}`);
      }}
      disabled={isLoading}
      className="mt-2 inline-flex w-full justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-70"
    >
      {isLoading ? "Preparando validacion..." : "Confirmar llegada manual"}
    </button>
  );
}
