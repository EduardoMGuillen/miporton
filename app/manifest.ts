import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MiVisita",
    short_name: "MiVisita",
    description: "Control de visitas y accesos residenciales con QR.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/logomivisita.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logomivisita.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logomivisita.png",
        sizes: "1024x1024",
        type: "image/png",
      },
    ],
  };
}
