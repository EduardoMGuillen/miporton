import JSZip from "jszip";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DatabaseBackupAuthor } from "@/lib/database-backup-zip";
import { bufferFromScanPhoto, mimeToExt } from "@/lib/database-backup-zip";

/** Escaneos con al menos una foto; cada parte limita cuántos escaneos se leen por request (Vercel). */
export const DEFAULT_EVIDENCE_BACKUP_PAGE_SIZE = 40;
/** Tope por request; fotos grandes pueden agotar tiempo — baja el valor en el selector si falla. */
export const MAX_EVIDENCE_BACKUP_PAGE_SIZE = 250;

const evidenceWhere: Prisma.QrScanWhereInput = {
  OR: [{ idPhotoData: { not: null } }, { platePhotoData: { not: null } }],
};

export async function countQrScansWithEvidence(): Promise<number> {
  return prisma.qrScan.count({ where: evidenceWhere });
}

export function evidenceBackupTotalParts(
  scansWithEvidence: number,
  pageSize: number,
): number {
  if (scansWithEvidence <= 0) return 0;
  return Math.ceil(scansWithEvidence / pageSize);
}

function clampPageSize(raw: number): number {
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_EVIDENCE_BACKUP_PAGE_SIZE;
  return Math.min(MAX_EVIDENCE_BACKUP_PAGE_SIZE, Math.floor(raw));
}

export async function buildEvidenceBackupZipPart(options: {
  part: number;
  pageSize: number;
  author: DatabaseBackupAuthor;
}): Promise<{
  buffer: Buffer;
  fileName: string;
  part: number;
  totalParts: number;
  pageSize: number;
  scanIds: string[];
} | null> {
  const pageSize = clampPageSize(options.pageSize);
  const total = await countQrScansWithEvidence();
  const totalParts = evidenceBackupTotalParts(total, pageSize);
  if (totalParts === 0) {
    return null;
  }

  const part = Math.min(Math.max(1, Math.floor(options.part)), totalParts);
  const skip = (part - 1) * pageSize;

  const batch = await prisma.qrScan.findMany({
    where: evidenceWhere,
    orderBy: { scannedAt: "asc" },
    skip,
    take: pageSize,
  });

  const zip = new JSZip();
  const generatedAt = new Date();
  const scanIds: string[] = [];

  for (const scan of batch) {
    scanIds.push(scan.id);
    const idBuf = bufferFromScanPhoto(scan.idPhotoData as unknown);
    const plateBuf = bufferFromScanPhoto(scan.platePhotoData as unknown);
    const idExt = mimeToExt(scan.idPhotoMimeType);
    const plateExt = mimeToExt(scan.platePhotoMimeType);
    const idPhotoFile = idBuf ? `evidence/${scan.id}/id${idExt}` : null;
    const platePhotoFile = plateBuf
      ? `evidence/${scan.id}/plate${plateExt}`
      : null;

    if (idBuf && idPhotoFile) {
      zip.file(idPhotoFile, idBuf, { compression: "STORE" });
    }
    if (plateBuf && platePhotoFile) {
      zip.file(platePhotoFile, plateBuf, { compression: "STORE" });
    }
  }

  zip.file(
    "evidence-part-manifest.json",
    JSON.stringify(
      {
        kind: "evidence-part",
        backupFormatVersion: 3,
        part,
        totalParts,
        pageSize,
        generatedAt: generatedAt.toISOString(),
        generatedBy: options.author.fullName,
        generatedByUserId: options.author.userId,
        scanIds,
        note:
          "Solo carpetas evidence/. Combina con el ZIP de datos (1/2). Descomprime todas las partes en la misma raiz o copia evidence/ al backup completo.",
      },
      null,
      2,
    ),
  );

  const buffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const dateStr = generatedAt.toISOString().slice(0, 10);
  const fileName = `mivisita-evidence-p${String(part).padStart(2, "0")}-of-${String(totalParts).padStart(2, "0")}-${dateStr}.zip`;

  return { buffer, fileName, part, totalParts, pageSize, scanIds };
}
