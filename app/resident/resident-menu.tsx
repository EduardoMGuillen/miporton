"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/login/actions";
import { RefreshButton } from "@/app/components/refresh-button";
import { LogoutSubmitButton } from "@/app/components/logout-submit-button";
import { setResidentLocaleAction } from "@/app/resident/actions";
import { useResidentT } from "@/app/resident/resident-i18n-context";

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isActivePath(pathname: string, href: string) {
  const p = normalizePath(pathname);
  const h = normalizePath(href);
  if (h === "/resident") return p === "/resident";
  return p === h;
}

type MenuLink = {
  href: string;
  labelKey: string;
  icon: ReactNode;
};

function IconUser() {
  return (
    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHome() {
  return (
    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 9.5a2.5 2.5 0 1 1 3.2 2.4c-.8.4-1.2.9-1.2 1.6V14M12 17h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconMessage() {
  return (
    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4 4v-4.2A2 2 0 0 1 4 16V5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMegaphone() {
  return (
    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 11v2a2 2 0 0 0 2 2h1v4h2v-4h2l5 2V5L11 7H6a2 2 0 0 0-2 2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M18 9a3 3 0 0 1 0 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="m19.4 15 .9-.6c.3-.2.5-.6.4-.9l-.8-2.8c-.1-.4-.5-.7-.9-.7h-.2l-1 .2c-.3.1-.7 0-.9-.2l-1.2-1c-.2-.2-.4-.6-.3-.9l.3-1c.1-.4-.1-.9-.5-1.1l-2.6-1.5c-.4-.2-.9-.1-1.2.2l-.7.8c-.2.3-.6.5-.9.5h-1.6c-.4 0-.8-.2-1-.5l-.7-.8c-.3-.4-.8-.5-1.2-.2L6 7.4c-.4.2-.6.7-.5 1.1l.3 1c.1.3 0 .7-.3.9l-1.2 1c-.3.2-.7.3-1 .2l-1-.2h-.2c-.4 0-.8.3-.9.7l-.8 2.8c-.1.4 0 .8.4 1l.9.6c.3.2.6.6.6 1v1.4c0 .4-.3.8-.6 1l-.9.6c-.4.2-.5.6-.4 1l.8 2.8c.1.4.5.7.9.7h.2l1-.2c.3-.1.7 0 1 .2l1.2 1c.2.2.4.6.3.9l-.3 1c-.1.4.1.9.5 1.1l2.6 1.5c.4.2.9.1 1.2-.2l.7-.8c.2-.3.6-.5 1-.5h1.6c.4 0 .8.2 1 .5l.7.8c.3.4.8.5 1.2.2l2.6-1.5c.4-.2.6-.7.5-1.1l-.3-1c-.1-.3 0-.7.3-.9l1.2-1c.3-.2.7-.3 1-.2l1 .2h.2c.4 0 .8-.3.9-.7l.8-2.8c.1-.4 0-.8-.4-1l-.9-.6a1.2 1.2 0 0 1-.6-1v-1.4c0-.4.3-.8.6-1Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg className="h-6 w-6 text-slate-700" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const MENU_LINKS: MenuLink[] = [
  { href: "/resident", labelKey: "menu.inicio", icon: <IconHome /> },
  { href: "/resident/anuncios", labelKey: "menu.anuncios", icon: <IconMegaphone /> },
  { href: "/resident/perfil", labelKey: "menu.perfil", icon: <IconUser /> },
  { href: "/resident/soporte", labelKey: "menu.soporte", icon: <IconHelp /> },
  { href: "/resident/sugerencias", labelKey: "menu.sugerencias", icon: <IconMessage /> },
  { href: "/resident/ajustes", labelKey: "menu.ajustes", icon: <IconSettings /> },
];

export function ResidentMenu({
  userFullName,
  residentialName,
}: {
  userFullName: string;
  residentialName: string;
}) {
  const { t, locale } = useResidentT();
  const pathname = usePathname() ?? "/resident";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const initial = userFullName.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative z-50" ref={rootRef}>
      <button
        type="button"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("menu.openAria")}
        onClick={() => setOpen((v) => !v)}
      >
        <IconMenu />
      </button>

      {open ? (
        <div
          className="absolute right-0 z-[100] mt-2 max-h-[min(32rem,calc(100dvh-6rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] w-[min(18.5rem,calc(100dvw-2.75rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white shadow-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:w-[min(20rem,calc(100dvw-2.75rem-env(safe-area-inset-left,0px)-env(safe-area-inset-right,0px)))]"
          role="menu"
        >
          <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-start gap-2.5 sm:gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800 sm:h-11 sm:w-11 sm:text-base">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{userFullName}</p>
                <p className="truncate text-xs text-slate-600">{residentialName}</p>
              </div>
            </div>
          </div>

          <nav className="py-1.5 sm:py-2">
            {MENU_LINKS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  className={`flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium transition sm:gap-3 sm:px-4 sm:py-2.5 sm:text-sm ${
                    active ? "bg-blue-50 text-blue-900" : "text-slate-800 hover:bg-slate-50"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  <span className="shrink-0 [&>svg]:h-[1.125rem] [&>svg]:w-[1.125rem] sm:[&>svg]:h-5 sm:[&>svg]:w-5">
                    {item.icon}
                  </span>
                  <span className="min-w-0 truncate">{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-100 px-2.5 py-2 sm:px-3">
            <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("menu.language")}
            </p>
            <div className="grid gap-1">
              <form action={setResidentLocaleAction}>
                <input type="hidden" name="locale" value="es" />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  <span>{t("menu.langEs")}</span>
                  {locale === "es" ? (
                    <span className="text-xs font-normal text-slate-500">{t("menu.current")}</span>
                  ) : null}
                </button>
              </form>
              <form action={setResidentLocaleAction}>
                <input type="hidden" name="locale" value="en" />
                <button
                  type="submit"
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  <span>{t("menu.langEn")}</span>
                  {locale === "en" ? (
                    <span className="text-xs font-normal text-slate-500">{t("menu.current")}</span>
                  ) : null}
                </button>
              </form>
            </div>
          </div>

          <div className="border-t border-slate-100 px-2.5 py-2.5 sm:px-3 sm:py-3">
            <RefreshButton
              className="flex w-full items-center justify-center px-3 py-2.5 text-sm font-semibold"
              idleLabel={t("refresh.idle")}
              pendingLabel={t("refresh.pending")}
              title={t("refresh.aria")}
              ariaLabel={t("refresh.aria")}
            />
          </div>

          <div className="border-t border-slate-100 px-2.5 pb-2.5 sm:px-3 sm:pb-3">
            <form action={logoutAction} className="px-0.5 sm:px-1">
              <LogoutSubmitButton
                className="flex w-full items-center justify-center gap-2 border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100"
                idleLabel={t("logout.idle")}
                pendingLabel={t("logout.pending")}
                confirmMessage={t("logout.confirm")}
                ariaLabel={t("logout.aria")}
              />
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
