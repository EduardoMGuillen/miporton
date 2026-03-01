import { logoutAction } from "@/app/login/actions";

export function DashboardShell({
  title,
  subtitle,
  user,
  children,
}: {
  title: string;
  subtitle: string;
  user: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:py-8">
      <header className="surface-card flex flex-wrap items-end justify-between gap-4 p-5 md:p-6">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700">MiPorton</p>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
          <p className="mt-2 text-xs text-slate-500">Sesion activa: {user}</p>
        </div>
        <form action={logoutAction}>
          <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
            Cerrar sesion
          </button>
        </form>
      </header>
      {children}
    </main>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <section className="surface-card p-5 md:p-6">{children}</section>;
}
