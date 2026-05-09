import type { SiteBannerVariant } from "@prisma/client";

const VARIANT_STYLES: Record<SiteBannerVariant, string> = {
  INFO: "border-b border-blue-200 bg-blue-50 text-blue-900",
  SUCCESS: "border-b border-emerald-200 bg-emerald-50 text-emerald-900",
  WARNING: "border-b border-amber-200 bg-amber-50 text-amber-900",
  ALERT: "border-b border-red-200 bg-red-50 text-red-900",
  NEUTRAL: "border-b border-slate-200 bg-slate-100 text-slate-800",
};

export function GlobalSiteBanner({
  message,
  variant,
}: {
  message: string;
  variant: SiteBannerVariant;
}) {
  const tone = VARIANT_STYLES[variant] ?? VARIANT_STYLES.INFO;
  return (
    <div role="status" className={`px-4 py-3 text-center text-sm font-medium ${tone}`}>
      {message}
    </div>
  );
}
