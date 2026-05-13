export const LANDING_LOCALE_COOKIE = "mivisita-landing-locale";

export type LandingLocale = "es" | "en";

export function parseLandingLocale(value: string | undefined): LandingLocale {
  return value === "en" ? "en" : "es";
}
