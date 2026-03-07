import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StandaloneLoginRedirect } from "@/app/components/standalone-login-redirect";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://miporton.vercel.app";

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
      "Gestiona visitas con QR, reservas de zonas, valida ingresos en porteria y mantente informado al instante.",
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
      "Invitaciones QR, reservas de zonas, validacion en entrada y notificaciones en tiempo real para residenciales.",
    images: ["/logomivisita.png"],
  },
  icons: {
    icon: [{ url: "/logomivisita.png", sizes: "any", type: "image/png" }],
    shortcut: ["/logomivisita.png"],
    apple: [{ url: "/logomivisita.png", sizes: "180x180", type: "image/png" }],
  },
};

export default async function Home() {
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
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
      <StandaloneLoginRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />
      <header className="surface-card flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logomivisita.png"
            alt="Logo MiVisita"
            width={40}
            height={40}
            className="rounded-lg"
            priority
          />
          <div>
            <p className="text-sm font-semibold text-slate-900">MiVisita</p>
            <p className="text-xs text-slate-500">Acceso residencial inteligente</p>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link
            href="/login?install=1"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Instalar app
          </Link>
          <Link href="/login" className="btn-primary text-sm">
            Iniciar sesion
          </Link>
        </nav>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="surface-card p-8">
          <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
            Plataforma de seguridad residencial
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
            Tu entrada residencial, digital y controlada
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            MiVisita conecta residentes, guardias y administradores para controlar ingresos con QR,
            notificaciones en vivo y registro de evidencias. Menos llamadas, menos confusion y mas
            seguridad operativa.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Acceso con QR seguro</p>
              <p className="mt-1 text-sm text-slate-600">
                Vigencia por tiempo o uso, validacion inmediata en porteria.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Alertas en tiempo real</p>
              <p className="mt-1 text-sm text-slate-600">
                Residentes reciben aviso al momento de llegada o delivery.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Registro trazable</p>
              <p className="mt-1 text-sm text-slate-600">
                Historial de entradas, filtros por mes y exportacion por registro.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Reservas de zonas comunes</p>
              <p className="mt-1 text-sm text-slate-600">
                Calendario de reservas, bloqueos administrativos y control por horas maximas.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/login" className="btn-primary">
              Entrar al panel
            </Link>
            <Link
              href="/login?install=1"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Instalar app
            </Link>
          </div>
        </article>

        <article className="surface-card p-8">
          <h2 className="text-2xl font-bold text-slate-900">Como funciona MiVisita</h2>
          <ol className="mt-4 space-y-4 text-sm text-slate-700">
            <li>
              <p className="font-semibold text-slate-900">1) Residente crea la invitacion</p>
              <p>Genera QR con vigencia definida y lo comparte por WhatsApp o PDF.</p>
            </li>
            <li>
              <p className="font-semibold text-slate-900">2) Guardia valida en entrada</p>
              <p>Escanea QR, registra evidencia cuando aplica y confirma el ingreso.</p>
            </li>
            <li>
              <p className="font-semibold text-slate-900">3) Sistema notifica y registra</p>
              <p>Se envian alertas al residente y queda historial auditable para admin.</p>
            </li>
            <li>
              <p className="font-semibold text-slate-900">4) Gestion de zonas y reportes</p>
              <p>Los residentes reservan zonas y administracion controla bloqueos y reportes PDF.</p>
            </li>
          </ol>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nota operacional
            </p>
            <p className="mt-2 text-sm text-slate-600">
              El alta de usuarios la realiza el equipo administrador del residencial o super admin.
            </p>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <article className="surface-card p-6">
          <p className="text-sm font-semibold text-slate-900">Modulo Residente</p>
          <p className="mt-2 text-sm text-slate-600">
            Crea visitas, reserva zonas comunes y recibe avisos de llegada, delivery y recordatorios.
          </p>
        </article>
        <article className="surface-card p-6">
          <p className="text-sm font-semibold text-slate-900">Modulo Guardia</p>
          <p className="mt-2 text-sm text-slate-600">
            Escaneo rapido, validacion con evidencia y notificacion directa al residente.
          </p>
        </article>
        <article className="surface-card p-6">
          <p className="text-sm font-semibold text-slate-900">Modulo Administracion</p>
          <p className="mt-2 text-sm text-slate-600">
            Monitoreo de entradas, reservas y bloqueos, comunicados push y exportes para auditoria.
          </p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <article className="surface-card p-6">
          <p className="text-sm font-semibold text-slate-900">Nuevas capacidades operativas</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>- QR con validez infinita y descripcion opcional.</li>
            <li>- Evidencia de ID y placa para visitas en vehiculo.</li>
            <li>- Reporte mensual PDF de entradas y delivery.</li>
            <li>- Comunicados push por residencial (masivo o seleccionado).</li>
          </ul>
        </article>
        <article className="surface-card p-6">
          <p className="text-sm font-semibold text-slate-900">Para equipos administrativos</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>- Creacion de zonas y politicas por horas maximas.</li>
            <li>- Bloqueo de fechas/rangos de uso en calendario.</li>
            <li>- Notificacion inmediata al admin cuando hay nueva reserva.</li>
            <li>- Notificacion al residente por cancelaciones de reserva por admin.</li>
          </ul>
        </article>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <article className="surface-card p-6">
          <p className="text-sm font-semibold text-slate-900">Funciones para Super Admin</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>- Alta de residenciales y administradores.</li>
            <li>- Cotizaciones y contratos con PDF profesional e impresion posterior.</li>
            <li>- Suspension temporal de residencial con reactivacion por switch.</li>
            <li>- Backup manual de reportes (PDF por residencial).</li>
            <li>- Backup completo de base de datos en ZIP.</li>
          </ul>
        </article>
        <article className="surface-card p-6">
          <p className="text-sm font-semibold text-slate-900">Trazabilidad, soporte y seguridad</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>- Registro de entradas con filtros avanzados y exportes por registro.</li>
            <li>- Evidencia de ID y placa integrada en reportes mensuales PDF.</li>
            <li>- Configuracion de WhatsApp de soporte por residencial.</li>
            <li>- Vista de sugerencias de residentes para administracion.</li>
            <li>- Retencion de evidencia sensible por politica de 60 dias.</li>
          </ul>
        </article>
      </section>
    </main>
  );
}
