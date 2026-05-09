/**
 * Genera el mismo ZIP que /api/super-admin/database-backup, sin limite de tiempo de Vercel.
 *
 * Uso (con imagenes):
 *   DATABASE_URL="postgresql://..." npx tsx scripts/database-backup.ts
 *
 * Sin imagenes:
 *   ... npx tsx scripts/database-backup.ts --skip-evidence
 *
 * Opcional: BACKUP_OUT_DIR (default: cwd), BACKUP_AUTHOR_NAME, BACKUP_AUTHOR_USER_ID
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildDatabaseBackupZip } from "@/lib/database-backup-zip";
import { prisma } from "@/lib/prisma";

async function main() {
  const skipEvidence = process.argv.includes("--skip-evidence");
  const outDir = process.env.BACKUP_OUT_DIR ?? process.cwd();
  const author = {
    fullName: process.env.BACKUP_AUTHOR_NAME ?? "local-script",
    userId: process.env.BACKUP_AUTHOR_USER_ID ?? "local-script",
  };

  if (
    !process.env.DATABASE_URL &&
    !process.env.POSTGRES_PRISMA_URL &&
    !process.env.POSTGRES_URL
  ) {
    console.error(
      "Falta DATABASE_URL (o POSTGRES_PRISMA_URL / POSTGRES_URL). Copia la URL de produccion desde Vercel.",
    );
    process.exit(1);
  }

  console.error(
    skipEvidence
      ? "Generando backup sin bytes de evidencia..."
      : "Generando backup con evidencia (puede tardar)...",
  );

  const { buffer, fileName } = await buildDatabaseBackupZip({ skipEvidence, author });
  const path = resolve(outDir, fileName);
  writeFileSync(path, buffer);
  console.error("Listo:", path, `(${(buffer.length / (1024 * 1024)).toFixed(2)} MiB)`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  void prisma.$disconnect();
  process.exit(1);
});
