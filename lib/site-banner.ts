import type { SiteBannerVariant } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SITE_BANNER_ID = "global";

export type ActiveSiteBanner = {
  message: string;
  variant: SiteBannerVariant;
};

export async function getActiveSiteBanner(): Promise<ActiveSiteBanner | null> {
  try {
    const row = await prisma.siteBanner.findUnique({
      where: { id: SITE_BANNER_ID },
    });
    if (!row?.enabled) return null;
    const text = row.message.trim();
    if (text.length === 0) return null;
    return { message: text, variant: row.variant };
  } catch {
    return null;
  }
}
