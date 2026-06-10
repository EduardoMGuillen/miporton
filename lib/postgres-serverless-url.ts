/**
 * Ajusta URLs de Postgres para entornos serverless (Vercel + Supabase pooler).
 */
export function normalizeServerlessPostgresUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed.replace(/^postgresql:/, "postgres:"));
    const host = url.hostname;
    const isSupabase = host.includes("supabase.co");
    let port = url.port || "";

    // db.PROJECT.supabase.co sin puerto o con 5432 no llega desde Vercel (IPv6 directo).
    // Transaction pooler en el mismo host usa 6543.
    const isSupabaseDbHost = /^db\.[a-z0-9]+\.supabase\.co$/i.test(host);
    if (isSupabaseDbHost && (port === "" || port === "5432")) {
      url.port = "6543";
      port = "6543";
    }

    if (!port) {
      port = "5432";
    }

    if (isSupabase && !url.searchParams.has("sslmode")) {
      url.searchParams.set("sslmode", "require");
    }

    // Prisma + Supavisor transaction mode (puerto 6543)
    if (isSupabase && port === "6543" && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    return url.toString().replace(/^postgres:/, "postgresql:");
  } catch {
    return trimmed;
  }
}

export function dragonConnectionHint(errorMessage: string): string | null {
  if (!/can't reach database server/i.test(errorMessage)) {
    return null;
  }
  if (/supabase\.co:5432/i.test(errorMessage)) {
    return (
      "Vercel intento el puerto 5432 (directo). En DATABASE_URL_DRAGON usa :6543, usuario " +
      "mivisita_readonly.uzgkoqsvnjschyqwudmf y redeploy. Si ya tienes :6543, copia la misma URL " +
      "que usa mivisita-dragon en Vercel (host y puerto) y solo cambia usuario/contraseña."
    );
  }
  return (
    "Revisa DATABASE_URL_DRAGON en Vercel: debe ser el pooler (puerto 6543), no la conexion directa (5432)."
  );
}
