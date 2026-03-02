import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";
import { defaultSuperAdminCredentials, ensureSuperAdminExists } from "@/lib/bootstrap";
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
            <h1 className="text-3xl font-bold text-slate-900">Iniciar sesion</h1>
            <p className="mt-1 text-sm text-slate-600">Accede a tu panel de MiPorton.</p>
          </div>
          {!dbConfigured ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Falta configurar la conexion a base de datos en variables de entorno.
            </div>
          ) : null}
          <LoginForm />
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <p className="font-semibold">Credenciales iniciales (solo primera vez):</p>
            <p>Correo: {defaultSuperAdminCredentials.email}</p>
            <p>Password: {defaultSuperAdminCredentials.password}</p>
          </div>
        </article>
      </section>
    </main>
  );
}
