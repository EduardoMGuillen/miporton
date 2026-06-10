import { PrismaClient } from "@prisma/client";

declare global {
  var prismaDragon: PrismaClient | undefined;
}

const dragonDatabaseUrl = process.env.DATABASE_URL_DRAGON?.trim() ?? "";

export function isDragonStatsConfigured(): boolean {
  return dragonDatabaseUrl.length > 0;
}

function createDragonClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: dragonDatabaseUrl } },
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
