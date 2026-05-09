import { prisma } from "@/lib/prisma";

export const SITE_BANNER_ID = "global";

export async function getActiveSiteBannerMessage(): Promise<string | null> {
  try {
    const row = await prisma.siteBanner.findUnique({
      where: { id: SITE_BANNER_ID },
    });
    if (!row?.enabled) return null;
    const text = row.message.trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
