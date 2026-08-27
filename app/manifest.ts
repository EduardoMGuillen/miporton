import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MiVisita",
    short_name: "MiVisita",
    description: "Control de visitas, patrullaje y accesos residenciales con QR.",
    // Igual que gcbmesas: start en "/" + scope "/" (la landing redirige a /login en standalone).
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
