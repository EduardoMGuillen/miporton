"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { id: "reservas", label: "Reservas" },
  { id: "zonas", label: "Zonas" },
  { id: "bloqueos", label: "Bloqueos" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ZonasReservasTabs({
  reservasPanel,
  zonasPanel,
  bloqueosPanel,
}: {
  reservasPanel: ReactNode;
  zonasPanel: ReactNode;
  bloqueosPanel: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("reservas");

  const panels: Record<TabId, ReactNode> = {
    reservas: reservasPanel,
    zonas: zonasPanel,
    bloqueos: bloqueosPanel,
  };

  return (
    <div className="space-y-4">
      <div className="lg:hidden">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Seccion
        </label>
        <select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value as TabId)}
          className="field-base w-full"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 lg:flex">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:bg-white/70 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>{panels[activeTab]}</div>
    </div>
  );
}
