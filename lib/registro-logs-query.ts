import type { Prisma } from "@prisma/client";
import { qrScanEvidenceWhere, type EvidenceFilterMode } from "@/lib/registro-evidence-filter";

export const REGISTRO_PAGE_SIZE = 50;

export function parseRegistroPage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? "1", 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export type RegistroScanFilterInput = {
  monthStart: Date;
  monthEnd: Date;
  residentialId: string;
  visitorFilter: string;
  residentFilter: string;
  guardFilter: string;
  methodFilter: string;
  evidenceMode: EvidenceFilterMode;
};

export function buildRegistroQrScanWhere(f: RegistroScanFilterInput): Prisma.QrScanWhereInput {
  return {
    isValid: true,
    scannedAt: { gte: f.monthStart, lt: f.monthEnd },
    ...(f.guardFilter ? { scannerId: f.guardFilter } : {}),
    ...(f.methodFilter === "manual"
      ? { reason: { contains: "manual", mode: "insensitive" } }
      : f.methodFilter === "qr"
        ? { NOT: { reason: { contains: "manual", mode: "insensitive" } } }
        : {}),
    ...qrScanEvidenceWhere(f.evidenceMode),
    code: {
      residentialId: f.residentialId,
      ...(f.residentFilter ? { residentId: f.residentFilter } : {}),
      ...(f.visitorFilter ? { visitorName: { contains: f.visitorFilter, mode: "insensitive" } } : {}),
    },
  };
}

export type RegistroDeliveryFilterInput = {
  monthStart: Date;
  monthEnd: Date;
  residentialId: string;
  visitorFilter: string;
  residentFilter: string;
  guardFilter: string;
};

export function buildRegistroDeliveryWhere(f: RegistroDeliveryFilterInput): Prisma.DeliveryAnnouncementWhereInput {
  return {
    residentialId: f.residentialId,
    createdAt: { gte: f.monthStart, lt: f.monthEnd },
    ...(f.residentFilter ? { residentId: f.residentFilter } : {}),
    ...(f.guardFilter ? { guardId: f.guardFilter } : {}),
    ...(f.visitorFilter ? { note: { contains: f.visitorFilter, mode: "insensitive" } } : {}),
  };
}
