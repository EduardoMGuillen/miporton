export type ResidentLocale = "es" | "en";

export const RESIDENT_LOCALE_COOKIE = "resident-locale";

export function parseResidentLocale(value: string | undefined | null): ResidentLocale {
  if (value === "en") return "en";
  return "es";
}
