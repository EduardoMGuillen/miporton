import { prisma } from "@/lib/prisma";

export const PATROL_QR_PREFIX = "MPP:";

export function normalizePatrolCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withoutPrefix = trimmed.toUpperCase().startsWith(PATROL_QR_PREFIX)
    ? trimmed.slice(PATROL_QR_PREFIX.length)
    : trimmed;

  const code = withoutPrefix.trim();
  return code.length > 0 ? code : null;
}

export function patrolPayloadFromCode(code: string) {
  return `${PATROL_QR_PREFIX}${code}`;
}

export type PatrolScanResult = {
  ok: boolean;
  reason: string;
  zoneName?: string;
  checkedAt?: string;
};

export async function recordPatrolCheck(input: {
  scannedCode: string;
  guardId: string;
  residentialId: string | null | undefined;
}): Promise<PatrolScanResult> {
  if (!input.residentialId) {
    return { ok: false, reason: "Sesion de guardia sin residencial." };
  }

  const raw = input.scannedCode.trim();
  const rawUpper = raw.toUpperCase();
  // Prefijo de visitas (MP:) distinto de patrulla (MPP:).
  if (rawUpper.startsWith("MP:") && !rawUpper.startsWith(PATROL_QR_PREFIX)) {
    return { ok: false, reason: "Este QR es de visitas. Usa Escanear QR para anuncios." };
  }

  const code = normalizePatrolCode(raw);
  if (!code) {
    return { ok: false, reason: "Codigo de patrullaje invalido." };
  }

  const zone = await prisma.patrolZone.findFirst({
    where: {
      code,
      residentialId: input.residentialId,
    },
    select: { id: true, name: true, isActive: true },
  });

  if (!zone) {
    return { ok: false, reason: "Zona de patrullaje no encontrada en esta residencial." };
  }

  if (!zone.isActive) {
    return { ok: false, reason: "Esta zona de patrullaje esta desactivada." };
  }

  const check = await prisma.patrolCheck.create({
    data: {
      zoneId: zone.id,
      guardId: input.guardId,
      residentialId: input.residentialId,
    },
    select: { checkedAt: true },
  });

  return {
    ok: true,
    reason: "Patrullaje registrado.",
    zoneName: zone.name,
    checkedAt: check.checkedAt.toISOString(),
  };
}
