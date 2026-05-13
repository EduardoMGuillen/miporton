import type { Metadata } from "next";
import { cookies } from "next/headers";
import { StandaloneLoginRedirect } from "@/app/components/standalone-login-redirect";
import { MarketingHome } from "@/app/landing/marketing-home";
import { getSupportWhatsappUrl } from "@/lib/email/resend-client";
import { LANDING_LOCALE_COOKIE, parseLandingLocale } from "@/lib/landing-locale";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mivisita.app";

export const metadata: Metadata = {
  title: "MiVisita | Control de acceso residencial inteligente",
  description:
    "MiVisita digitaliza acceso residencial con QR, reservas de zonas, notificaciones push y reportes operativos para residentes, guardias y administradores.",
  keywords: [
    "control de acceso",
    "residencial",
    "visitas",
    "qr",
    "porteria",
    "seguridad residencial",
    "mi visita",
    "reservas de zonas",
    "reporte mensual",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: APP_URL,
    title: "MiVisita | Seguridad y control de visitas",
    description:
      "Gestiona visitas con QR, reservas de zonas, valida ingresos en portería y mantente informado al instante.",
    siteName: "MiVisita",
    images: [
      {
        url: "/logomivisita.png",
        width: 1024,
        height: 1024,
        alt: "Logo MiVisita",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MiVisita | Control de acceso residencial",
    description:
      "Invitaciones QR, reservas de zonas, validación en entrada y notificaciones en tiempo real para residenciales.",
    images: ["/logomivisita.png"],
  },
  icons: {
    icon: [{ url: "/logomivisita.png", sizes: "any", type: "image/png" }],
    shortcut: ["/logomivisita.png"],
    apple: [{ url: "/logomivisita.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function Home() {
  const jar = await cookies();
  const initialLocale = parseLandingLocale(jar.get(LANDING_LOCALE_COOKIE)?.value);
  const whatsappUrl = getSupportWhatsappUrl();

  const landingJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MiVisita",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Android, iOS",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "HNL",
    },
    description:
      "Plataforma de control de acceso residencial con QR, reservas de zonas, notificaciones push y paneles para guardias, residentes y administradores.",
    url: APP_URL,
  };

  return (
    <>
      <StandaloneLoginRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      <MarketingHome initialLocale={initialLocale} whatsappUrl={whatsappUrl} />
    </>
  );
}
