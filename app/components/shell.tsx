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
  /** Rejilla titulo + acciones: evita que el menu residente baje de linea en Android (pantallas estrechas). */
  compactHeaderActions = false,
  children,
}: {
  title: string;
  subtitle: string;
  user: string;
  headerRight?: ReactNode;
  showActiveSession?: boolean;
  compactHeaderActions?: boolean;
  children: ReactNode;
}) {
  const headerClass = compactHeaderActions
    ? "surface-card relative z-50 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-5 sm:gap-4 md:p-6"
    : "surface-card relative z-50 flex flex-col gap-4 p-5 sm:flex-row sm:flex-nowrap sm:items-start sm:justify-between sm:gap-4 md:p-6";
  const titleBlockClass = compactHeaderActions
    ? "min-w-0 space-y-1 pr-2"
    : "min-w-0 flex-1 space-y-1 sm:pr-2";
  const actionsClass = compactHeaderActions
    ? "flex shrink-0 items-center justify-end gap-2"
    : "flex w-full shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-3 sm:w-auto sm:justify-end sm:border-0 sm:pt-0";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 md:py-8">
      <header className={headerClass}>
        <div className={titleBlockClass}>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-700">MiVisita</p>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{title}</h1>
          <p className="text-sm text-slate-600">{subtitle}</p>
          {showActiveSession ? (
            <p className="mt-2 text-xs text-slate-500">Sesion activa: {user}</p>
          ) : null}
        </div>
        <div className={actionsClass}>
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
  return <section className="surface-card min-w-0 overflow-x-hidden p-5 md:p-6">{children}</section>;
}
