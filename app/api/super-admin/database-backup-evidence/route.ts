import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  buildEvidenceBackupZipPart,
  countQrScansWithEvidence,
  DEFAULT_EVIDENCE_BACKUP_PAGE_SIZE,
  evidenceBackupTotalParts,
  MAX_EVIDENCE_BACKUP_PAGE_SIZE,
} from "@/lib/database-backup-evidence-zip";

export const maxDuration = 120;
export const runtime = "nodejs";

function parsePageSize(raw: string | null): number {
  if (raw == null || raw === "") return DEFAULT_EVIDENCE_BACKUP_PAGE_SIZE;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return DEFAULT_EVIDENCE_BACKUP_PAGE_SIZE;
  return Math.min(MAX_EVIDENCE_BACKUP_PAGE_SIZE, Math.max(1, n));
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const infoOnly =
    searchParams.get("info") === "1" ||
    searchParams.get("info") === "true";

  const pageSize = parsePageSize(searchParams.get("pageSize"));

  if (infoOnly) {
    try {
      const scansWithEvidence = await countQrScansWithEvidence();
      const totalParts = evidenceBackupTotalParts(scansWithEvidence, pageSize);
      return NextResponse.json({
        scansWithEvidence,
        pageSize,
        totalParts,
        defaultPageSize: DEFAULT_EVIDENCE_BACKUP_PAGE_SIZE,
        maxPageSize: MAX_EVIDENCE_BACKUP_PAGE_SIZE,
      });
    } catch (error) {
      console.error("[database-backup-evidence info]", error);
      const detail = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: "No se pudo consultar evidencia.", detail },
        { status: 500 },
      );
    }
  }

  const partRaw = searchParams.get("part");
  const part = partRaw == null ? NaN : Number.parseInt(partRaw, 10);
  if (!Number.isFinite(part) || part < 1) {
    return NextResponse.json(
      { error: "Parametro part requerido (entero >= 1). Usa info=1 para ver totalParts." },
      { status: 400 },
    );
  }

  try {
    const result = await buildEvidenceBackupZipPart({
      part,
      pageSize,
      author: { fullName: session.fullName, userId: session.userId },
    });

    if (!result) {
      return NextResponse.json(
        { error: "No hay escaneos con fotos de evidencia para exportar." },
        { status: 404 },
      );
    }

    const { buffer, fileName, totalParts, part: partOut } = result;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Evidence-Backup-Part": String(partOut),
        "X-Evidence-Backup-Total-Parts": String(totalParts),
      },
    });
  } catch (error) {
    console.error("[database-backup-evidence]", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error:
          "No se pudo generar la parte de evidencia. Prueba pageSize mas pequeño o descarga otra parte.",
        detail,
      },
      { status: 500 },
    );
  }
}
