import { PrismaClient } from "@prisma/client";
import { normalizeServerlessPostgresUrl } from "@/lib/postgres-serverless-url";

declare global {
  var prismaDragon: PrismaClient | undefined;
}

const rawDragonUrl = process.env.DATABASE_URL_DRAGON?.trim() ?? "";
const dragonDatabaseUrl = rawDragonUrl
  ? normalizeServerlessPostgresUrl(rawDragonUrl)
  : "";

export function isDragonStatsConfigured(): boolean {
  return dragonDatabaseUrl.length > 0;
}

function createDragonClient(): PrismaClient {
  // datasourceUrl evita que Prisma mezcle DIRECT_URL de MiVisita con esta conexion.
  return new PrismaClient({
    datasourceUrl: dragonDatabaseUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Segundo cliente Prisma (solo lectura por diseño) hacia la BD de Control Dragon. */
export const prismaDragon: PrismaClient | null = isDragonStatsConfigured()
  ? global.prismaDragon ?? createDragonClient()
  : null;

if (process.env.NODE_ENV !== "production" && prismaDragon) {
  global.prismaDragon = prismaDragon;
}
