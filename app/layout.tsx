import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MiPorton",
  description: "Webapp de control de visitas con QR para residenciales.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", sizes: "500x500", type: "image/png" }],
    shortcut: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-white/60 bg-white/70 px-4 py-5 text-center text-sm text-slate-600 backdrop-blur">
            Powered by{" "}
            <a
              href="https://www.nexusglobalsuministros.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-900 transition hover:text-blue-700 hover:underline"
            >
              Nexus Global
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
