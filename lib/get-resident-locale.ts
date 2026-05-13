import { cookies } from "next/headers";
import { parseResidentLocale, RESIDENT_LOCALE_COOKIE } from "@/lib/resident-locale";
import type { ResidentLocale } from "@/lib/resident-locale";

export async function getResidentLocale(): Promise<ResidentLocale> {
  const jar = await cookies();
  return parseResidentLocale(jar.get(RESIDENT_LOCALE_COOKIE)?.value);
}
