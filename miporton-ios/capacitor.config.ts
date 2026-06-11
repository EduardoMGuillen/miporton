import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Shell nativo iOS: abre la PWA ya deployada en Vercel.
 * No empaqueta el build de Next.js; cambios web = deploy normal en MiPorton.
 *
 * Preview local (opcional):
 *   set CAP_SERVER_URL=https://tu-preview.vercel.app
 *   npm run cap:sync
 */
const productionUrl = "https://mivisita.app/login";
const serverUrl = process.env.CAP_SERVER_URL?.trim() || productionUrl;

const config: CapacitorConfig = {
  appId: "com.mivisita.app",
  appName: "MiVisita",
  webDir: "www",
  server: {
    url: serverUrl,
    cleartext: false,
    allowNavigation: ["mivisita.app", "*.mivisita.app", "*.vercel.app"],
  },
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: "#f4f7fb",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
