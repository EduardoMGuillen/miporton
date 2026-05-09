import type { Prisma } from "@prisma/client";

export type EvidenceFilterMode = "all" | "with" | "without";

/** URL ?logEvidence= — "all" incluye registros con foto, sin foto y evidencia purgada por retención. */
export function parseEvidenceFilterMode(raw: string): EvidenceFilterMode {
  const t = raw.trim();
  if (t === "with") return "with";
  if (t === "without") return "without";
  return "all";
}

export function qrScanEvidenceWhere(mode: EvidenceFilterMode): Prisma.QrScanWhereInput {
  if (mode === "with") return { idPhotoData: { not: null } };
  if (mode === "without") return { idPhotoData: null };
  return {};
}
