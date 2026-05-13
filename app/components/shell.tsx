import type { ReactNode } from "react";
import { logoutAction } from "@/app/login/actions";
import { RefreshButton } from "@/app/components/refresh-button";
import { LogoutSubmitButton } from "@/app/components/logout-submit-button";

export function DashboardShell({
  title,
  subtitle,
  user,
  headerRight,
  showActiveSession = true,
  children,
}: {
  title: string;
  subtitle: string;
  user: string;
  headerRight?: ReactNode;
  showActiveSession?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:py-8">
      <header className="surface-card relative z-50 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-5 sm:gap-4 md:p-6">
        <div className="min-w-0 space-y-1 pr-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700">MiVisita</p>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
          {showActiveSession ? (
            <p className="mt-2 text-xs text-slate-500">Sesion activa: {user}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          {headerRight ?? (
            <>
              <RefreshButton />
              <form action={logoutAction}>
                <LogoutSubmitButton />
              </form>
            </>
          )}
        </div>
      </header>
      {children}
    </main>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <section className="surface-card p-5 md:p-6">{children}</section>;
}
