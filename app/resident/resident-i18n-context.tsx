"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { ResidentLocale } from "@/lib/resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";

type ResidentI18nValue = {
  locale: ResidentLocale;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const ResidentI18nContext = createContext<ResidentI18nValue | null>(null);

export function ResidentI18nProvider({
  locale,
  children,
}: {
  locale: ResidentLocale;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      t: (key: string, vars?: Record<string, string | number>) => residentT(locale, key, vars),
    }),
    [locale],
  );
  return <ResidentI18nContext.Provider value={value}>{children}</ResidentI18nContext.Provider>;
}

export function useResidentT() {
  const ctx = useContext(ResidentI18nContext);
  if (!ctx) {
    throw new Error("useResidentT must be used within ResidentI18nProvider");
  }
  return ctx;
}
