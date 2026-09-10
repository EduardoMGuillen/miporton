import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";
import { ensureSuperAdminExists } from "@/lib/bootstrap";
import { LoginForm } from "@/app/login/login-form";
import { LoginDownloadSection } from "@/app/components/login-download-section";

export const dynamic = "force-dynamic";

function getSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

/** Logo de la APK / icono de producto (mismo que Play Store). */
const APP_LOGO = "/512X512.png";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shouldOpenInstall = getSingleParam(params.install) === "1";
  const resetSuccess = getSingleParam(params.reset) === "ok";

  await ensureSuperAdminExists();
  const dbConfigured =
    Boolean(process.env.DATABASE_URL) ||
    Boolean(process.env.POSTGRES_PRISMA_URL) ||
    Boolean(process.env.POSTGRES_URL) ||
    Boolean(process.env.POSTGRES_URL_NON_POOLING);

  const session = await getSession();
  if (session) redirect(dashboardPathByRole(session.role));

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 0%, #93c5fd66 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 100% 20%, #bfdbfe88 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 50% 100%, #dbeafe99 0%, transparent 45%), linear-gradient(180deg, #eff6ff 0%, #f8fafc 55%, #ffffff 100%)",
        }}
      />

      <section className="relative grid w-full max-w-5xl items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#0f172a] p-8 text-white shadow-2xl shadow-blue-900/20 lg:flex lg:min-h-[640px] lg:flex-col lg:justify-between">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-sky-300/20 blur-2xl"
          />

          <div>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2 backdrop-blur">
              <Image
                src={APP_LOGO}
                alt="MiVisita"
                width={48}
                height={48}
                className="rounded-xl shadow-lg"
                priority
              />
              <div>
                <p className="text-sm font-bold tracking-tight">MiVisita</p>
                <p className="text-xs text-blue-100">Acceso residencial inteligente</p>
              </div>
            </div>

            <h1 className="mt-10 max-w-md text-4xl font-bold leading-[1.1] tracking-tight xl:text-5xl">
              Tu portón,
              <br />
              digital y seguro.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-blue-100">
              QR para visitas, validación en portería, reservas, patrullaje y alertas en tiempo real
              para residentes, guardias y administración.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 text-sm">
            {[
              "Control de visitas con evidencia",
              "Notificaciones push al instante",
              "App en Google Play y PWA instalable",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-slate-900">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </aside>

        <article className="w-full max-w-md justify-self-center rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/10 backdrop-blur-md sm:p-8 lg:max-w-none lg:justify-self-stretch">
          <div className="mb-6 text-center lg:text-left">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.75rem] bg-[#1d4ed8] shadow-lg shadow-blue-700/30 ring-4 ring-blue-100 lg:mx-0">
              <Image
                src={APP_LOGO}
                alt="Logo MiVisita"
                width={96}
                height={96}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              MiVisita
            </p>
            <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-slate-600">Accede a tu panel residencial.</p>
          </div>

          {!dbConfigured ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Falta configurar la conexión a base de datos en variables de entorno.
            </div>
          ) : null}

          <LoginForm resetSuccess={resetSuccess} />

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              App
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <LoginDownloadSection initialOtherOpen={shouldOpenInstall} />

          <p className="mt-6 text-center text-xs text-slate-500">
            ¿Nuevo en tu residencial?{" "}
            <Link href="/" className="font-semibold text-blue-700 hover:underline">
              Conoce MiVisita
            </Link>
          </p>
        </article>
      </section>
    </main>
  );
}
