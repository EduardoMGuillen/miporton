import type { Metadata } from "next";
import { cookies } from "next/headers";
import { StandaloneLoginRedirect } from "@/app/components/standalone-login-redirect";
import { MarketingHome } from "@/app/landing/marketing-home";
import { getSupportWhatsappUrl } from "@/lib/email/resend-client";
import { getPublicAppUrl } from "@/lib/get-public-app-url";
import { LANDING_LOCALE_COOKIE, parseLandingLocale } from "@/lib/landing-locale";

const APP_URL = getPublicAppUrl();

const PAGE_TITLE =
  "MiVisita | App #1 en Honduras para administración y seguridad residencial · QR y portería";
const PAGE_DESCRIPTION =
  "Plataforma líder en Honduras para conjuntos y residenciales: control de visitas con QR, portería digital, reservas de zonas comunes, notificaciones push, evidencias y reportes PDF. PWA para residentes, guardias y administración.";
const OG_DESCRIPTION =
  "Administración y seguridad residencial en Honduras con MiVisita: QR, portería, reservas, push y reportes. La referencia para conjuntos habitacionales.";

const KEYWORDS = [
  "MiVisita",
  "administración residencial Honduras",
  "seguridad residencial Honduras",
  "app residencial Honduras",
  "control de acceso Honduras",
  "portería digital Honduras",
  "visitas QR residencial",
  "conjunto habitacional Honduras",
  "condominio Honduras",
  "residencial Tegucigalpa",
  "residencial San Pedro Sula",
  "portero QR",
  "registro de visitas",
  "reservas zonas comunes",
  "notificaciones push residencial",
  "reporte mensual portería",
  "evidencia ingreso visita",
  "PWA residencial",
  "software portería",
  "gestión visitas conjunto",
  "acceso vehicular residencial",
  "delivery residencial",
  "residente app Honduras",
];

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: KEYWORDS,
  applicationName: "MiVisita",
  authors: [{ name: "MiVisita", url: APP_URL }],
  creator: "MiVisita",
  publisher: "MiVisita",
  category: "technology",
  referrer: "origin-when-cross-origin",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_HN",
    alternateLocale: ["en_US"],
    url: APP_URL,
    title: PAGE_TITLE,
    description: OG_DESCRIPTION,
    siteName: "MiVisita",
    countryName: "Honduras",
    images: [
      {
        url: "/logomivisita.png",
        width: 1024,
        height: 1024,
        alt: "MiVisita — administración y seguridad residencial en Honduras",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: OG_DESCRIPTION,
    images: ["/logomivisita.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/icon-192.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "geo.region": "HN",
    "geo.placename": "Honduras",
    "apple-mobile-web-app-title": "MiVisita",
  },
};

export default async function Home() {
  const jar = await cookies();
  const initialLocale = parseLandingLocale(jar.get(LANDING_LOCALE_COOKIE)?.value);
  const whatsappUrl = getSupportWhatsappUrl();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${APP_URL}/#website`,
        name: "MiVisita",
        url: APP_URL,
        inLanguage: ["es-HN", "en"],
        description: PAGE_DESCRIPTION,
        publisher: { "@id": `${APP_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${APP_URL}/#organization`,
        name: "MiVisita",
        url: APP_URL,
        logo: `${APP_URL}/logomivisita.png`,
        areaServed: {
          "@type": "Country",
          name: "Honduras",
          identifier: "HN",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "MiVisita",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "HNL",
        },
        description: PAGE_DESCRIPTION,
        url: APP_URL,
        downloadUrl: APP_URL,
        publisher: { "@id": `${APP_URL}/#organization` },
        author: { "@id": `${APP_URL}/#organization` },
        areaServed: { "@type": "Country", name: "Honduras", identifier: "HN" },
        featureList: [
          "Invitaciones QR con vigencia y control de usos",
          "Portería con evidencia de identificación y placa",
          "Reservas de zonas comunes y bloqueos administrativos",
          "Notificaciones push a residentes y administración",
          "Comunicados y reportes PDF mensuales",
          "Administración de usuarios, guardias y políticas por residencial",
        ],
      },
    ],
  };

  return (
    <>
      <StandaloneLoginRedirect />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHome initialLocale={initialLocale} whatsappUrl={whatsappUrl} />
    </>
  );
}
