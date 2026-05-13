import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/get-public-app-url";

export default function robots(): MetadataRoute.Robots {
  const base = getPublicAppUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/resident/", "/residential-admin/", "/guard/", "/super-admin/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
