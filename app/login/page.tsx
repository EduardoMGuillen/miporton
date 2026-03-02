import { redirect } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";
import { ensureSuperAdminExists } from "@/lib/bootstrap";
import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureSuperAdminExists();
  const dbConfigured =
    Boolean(process.env.DATABASE_URL) ||
    Boolean(process.env.POSTGRES_PRISMA_URL) ||
    Boolean(process.env.POSTGRES_URL) ||
    Boolean(process.env.POSTGRES_URL_NON_POOLING);

  const session = await getSession();
  if (session) redirect(dashboardPathByRole(session.role));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10">
      <section className="grid w-full gap-6 lg:grid-cols-2">
        <article className="surface-card hidden p-8 lg:block">
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="Logo MiPorton"
              width={56}
              height={56}
              className="rounded-xl"
              priority
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">MiPorton</p>
              <p className="text-xs text-slate-500">Acceso residencial inteligente</p>
            </div>
          </div>
          <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            Control de acceso residencial
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900">MiPorton</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Gestiona visitas con QR, valida ingresos y mantente informado en tiempo real cuando tu
            visita llegue al porton.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Multi residencial</p>
              <p className="mt-1 text-slate-600">Escalable para vender a varios proyectos.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">QR Seguro</p>
              <p className="mt-1 text-slate-600">Validez configurable por uso o por tiempo.</p>
            </div>
          </div>
        </article>

        <article className="surface-card w-full max-w-xl justify-self-center p-6 md:p-8">
          <div className="mb-5">
            <div className="mb-3 flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="Logo MiPorton"
                width={44}
                height={44}
                className="rounded-lg"
                priority
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">MiPorton</p>
                <p className="text-xs text-slate-500">Tu porton, digital y seguro</p>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Iniciar sesion</h1>
            <p className="mt-1 text-sm text-slate-600">Accede a tu panel de MiPorton.</p>
          </div>
          {!dbConfigured ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Falta configurar la conexion a base de datos en variables de entorno.
            </div>
          ) : null}
          <LoginForm />
        </article>
      </section>
    </main>
  );
}
