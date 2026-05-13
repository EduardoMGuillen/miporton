/** Origen público de la app (sin barra final). Usado en SEO, sitemap y JSON-LD. */
export function getPublicAppUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return "https://mivisita.app";
  return raw.replace(/\/$/, "");
}
