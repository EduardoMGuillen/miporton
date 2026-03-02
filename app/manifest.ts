import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MiPorton",
    short_name: "MiPorton",
    description: "Control de visitas y accesos residenciales con QR.",
    start_url: "/login",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "500x500",
        type: "image/png",
      },
    ],
  };
}
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MiPorton",
    short_name: "MiPorton",
    description: "Control de acceso residencial con QR y notificaciones en tiempo real.",
    start_url: "/login",
    display: "standalone",
    background_color: "#1d4ed8",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
