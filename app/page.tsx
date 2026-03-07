import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";
import { InstallAppGuide } from "@/app/components/install-app-guide";

export default async function Home() {
  const session = await getSession();
  const dashboardPath = session ? dashboardPathByRole(session.role) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
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
          <InstallAppGuide compact />
          {dashboardPath ? (
            <Link
              href={dashboardPath}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Ir a mi panel
            </Link>
          ) : null}
          <Link href="/login" className="btn-primary text-sm">
            Iniciar sesion
          </Link>
        </nav>
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="surface-card p-8">
          <p className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            Control de acceso residencial
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-slate-900">Tu porton, digital y seguro</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Gestiona visitas con QR, valida ingresos y mantente informado en tiempo real cuando tu visita
            llegue al porton.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Multi residencial</p>
              <p className="mt-1 text-sm text-slate-600">Escalable para vender a varios proyectos.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">QR Seguro</p>
              <p className="mt-1 text-sm text-slate-600">Validez configurable por uso o por tiempo.</p>
            </div>
          </div>
        </article>

        <article className="surface-card p-8">
          <h2 className="text-2xl font-bold text-slate-900">Flujo simple para residentes y guardias</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            <li>1. El residente anuncia una visita y comparte su QR.</li>
            <li>2. El guardia escanea el QR y valida el ingreso.</li>
            <li>3. MiVisita mantiene trazabilidad de accesos en tiempo real.</li>
          </ol>
          <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            El registro de usuarios lo gestiona el super admin, por lo que esta pagina ofrece acceso
            directo solo a inicio de sesion.
          </p>
        </article>
      </section>
    </main>
  );
}
