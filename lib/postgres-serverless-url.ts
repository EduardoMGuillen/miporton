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
  const unreachable = /can't reach database server|ENOTFOUND|getaddrinfo/i.test(errorMessage);
  if (!unreachable) {
    return null;
  }

  if (/db\.[a-z0-9]+\.supabase\.co/i.test(errorMessage)) {
    return (
      "El host db.….supabase.co (aunque sea puerto 6543) suele ser IPv6 y Vercel no lo alcanza en plan free. " +
      "No uses el host db.…. Copia la DATABASE_URL del proyecto mivisita-dragon en Vercel: el host debe ser " +
      "aws-0-REGION.pooler.supabase.com:6543 (pooler compartido). Solo cambia usuario a " +
      "mivisita_readonly.uzgkoqsvnjschyqwudmf y la contraseña del rol read-only."
    );
  }

  if (/supabase\.co:5432/i.test(errorMessage)) {
    return (
      "Puerto 5432 en host directo. Usa Transaction pooler :6543 en aws-0-REGION.pooler.supabase.com " +
      "(misma URL que mivisita-dragon, usuario read-only)."
    );
  }

  return (
    "Desde Vercel usa el pooler compartido (aws-0-REGION.pooler.supabase.com:6543), no db.….supabase.co. " +
    "Copia la DATABASE_URL de mivisita-dragon y cambia solo usuario/contraseña."
  );
}
