import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/get-public-app-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getPublicAppUrl();
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/forgot-password`, lastModified: now, changeFrequency: "yearly", priority: 0.35 },
    { url: `${base}/politicas-de-privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.45 },
    { url: `${base}/terminos-de-uso`, lastModified: now, changeFrequency: "yearly", priority: 0.45 },
    { url: `${base}/offline`, lastModified: now, changeFrequency: "yearly", priority: 0.15 },
  ];
}
