import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { PwaBootstrap } from "@/app/components/pwa-bootstrap";
import { GoogleAnalytics } from "@/app/components/google-analytics";
import { GlobalSiteBanner } from "@/app/components/global-site-banner";
import { getActiveSiteBanner } from "@/lib/site-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://mivisita.app"),
  title: "MiVisita",
  applicationName: "MiVisita",
  description:
    "MiVisita: administración y seguridad residencial en Honduras — control de visitas con QR, portería digital, reservas y reportes (PWA).",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MiVisita",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1d4ed8",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteBanner = await getActiveSiteBanner();

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <PwaBootstrap />
        <div className="flex min-h-screen flex-col">
          {siteBanner ? (
            <GlobalSiteBanner message={siteBanner.message} variant={siteBanner.variant} />
          ) : null}
          <div className="flex-1">{children}</div>
          <footer className="border-t border-white/60 bg-white/70 px-4 py-5 text-center text-sm text-slate-600 backdrop-blur">
            <p>
              Powered by{" "}
              <a
                href="https://www.nexusglobalsuministros.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 transition hover:text-blue-700 hover:underline"
              >
                Nexus Global
              </a>
            </p>
            <div className="mt-1 flex items-center justify-center gap-3 text-xs">
              <Link href="/politicas-de-privacidad" className="text-slate-700 transition hover:text-blue-700 hover:underline">
                Politicas de Privacidad
              </Link>
              <span className="text-slate-400">|</span>
              <Link href="/terminos-de-uso" className="text-slate-700 transition hover:text-blue-700 hover:underline">
                Terminos de Uso
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
