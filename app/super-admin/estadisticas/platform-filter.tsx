"use client";

import Link from "next/link";
import type { StatsPlatformFilter } from "@/lib/super-admin-stats";

const OPTIONS: { value: StatsPlatformFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "mivisita", label: "MiVisita" },
  { value: "dragon", label: "Dragon" },
];

export function StatsPlatformFilter({
  current,
  dragonConfigured,
}: {
  current: StatsPlatformFilter;
  dragonConfigured: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Plataforma</span>
      {OPTIONS.map((option) => {
        const disabled = option.value === "dragon" && !dragonConfigured;
        const isActive = current === option.value;
        if (disabled) {
          return (
            <span
              key={option.value}
              className="cursor-not-allowed rounded-lg border border-dashed border-slate-200 px-3 py-1.5 text-sm text-slate-400"
              title="Configura DATABASE_URL_DRAGON en Vercel"
            >
              {option.label}
            </span>
          );
        }
        return (
          <Link
            key={option.value}
            href={`/super-admin/estadisticas?platform=${option.value}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              isActive
                ? "border border-blue-200 bg-blue-50 text-blue-700"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
