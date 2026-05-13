"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useCallback } from "react";
import { useFormStatus } from "react-dom";
import { submitLandingLeadAction, type LandingLeadState } from "@/app/landing/actions";
import { landingT, LANDING_MARQUEE, type LandingCopyKey } from "@/app/landing/landing-dictionary";
import { LANDING_LOCALE_COOKIE, type LandingLocale } from "@/lib/landing-locale";

const FORM_ERR: Record<string, LandingCopyKey> = {
  name_short: "form.err.name_short",
  email_invalid: "form.err.email_invalid",
  message_short: "form.err.message_short",
};

function setLandingLocaleCookie(locale: LandingLocale) {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LANDING_LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};SameSite=Lax`;
}

function SubmitButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className="btn-primary w-full py-3 text-base font-semibold shadow-lg shadow-blue-500/25 transition disabled:opacity-60"
    >
      {isPending ? pending : idle}
    </button>
  );
}

function LeadForm({ locale }: { locale: LandingLocale }) {
  const t = useCallback((k: LandingCopyKey) => landingT(locale, k), [locale]);
  const [state, formAction] = useActionState(submitLandingLeadAction, { status: "idle" } satisfies LandingLeadState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  const errMsg = (field: string) => {
    if (state.status !== "validation") return null;
    const code = state.fieldErrors[field];
    if (!code) return null;
    const key = FORM_ERR[code];
    if (!key) return null;
    return <p className="mt-1 text-xs font-medium text-red-600">{t(key)}</p>;
  };

  return (
    <form ref={formRef} action={formAction} className="grid gap-4">
      <input
        type="text"
        name="trap"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      />
      <div>
        <label htmlFor="lead-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("form.name")}
        </label>
        <input id="lead-name" name="name" required className="field-base" autoComplete="name" />
        {errMsg("name")}
      </div>
      <div>
        <label htmlFor="lead-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("form.email")}
        </label>
        <input id="lead-email" name="email" type="email" required className="field-base" autoComplete="email" />
        {errMsg("email")}
      </div>
      <div>
        <label htmlFor="lead-phone" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("form.phone")}
        </label>
        <input id="lead-phone" name="phone" type="tel" className="field-base" autoComplete="tel" />
      </div>
      <div>
        <label htmlFor="lead-res" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("form.residential")}
        </label>
        <input id="lead-res" name="residentialHint" className="field-base" autoComplete="organization" />
      </div>
      <div>
        <label htmlFor="lead-msg" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("form.message")}
        </label>
        <textarea
          id="lead-msg"
          name="message"
          required
          rows={4}
          className="field-base min-h-[120px] resize-y"
          placeholder={t("form.placeholderMsg")}
        />
        {errMsg("message")}
      </div>
      {state.status === "success" ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          {t("form.success")}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.code === "RESEND_DISABLED" ? t("form.errorConfig") : t("form.errorNetwork")}
        </p>
      ) : null}
      <SubmitButton idle={t("form.submit")} pending={t("form.pending")} />
    </form>
  );
}

function IconSpark() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 8 9 14h6l-3 6 3-6H9l3-6Z"
        fill="currentColor"
        className="text-amber-300"
      />
    </svg>
  );
}

export function MarketingHome({
  initialLocale,
  whatsappUrl,
}: {
  initialLocale: LandingLocale;
  whatsappUrl: string | null;
}) {
  const [locale, setLocale] = useState<LandingLocale>(initialLocale);
  const t = useCallback((k: LandingCopyKey) => landingT(locale, k), [locale]);
  const tags = LANDING_MARQUEE[locale];
  const marqueeTrack = [...tags, ...tags];

  const pickLocale = (next: LandingLocale) => {
    setLocale(next);
    setLandingLocaleCookie(next);
  };

  return (
    <div className="relative overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/75 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Image src="/logomivisita.png" alt="MiVisita" width={40} height={40} className="shrink-0 rounded-xl shadow-sm" priority />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">MiVisita</p>
              <p className="hidden text-xs text-slate-500 sm:block">{t("nav.langHint")}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div
              className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold"
              role="group"
              aria-label={t("nav.langHint")}
            >
              <button
                type="button"
                onClick={() => pickLocale("es")}
                className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${locale === "es" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                aria-pressed={locale === "es"}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => pickLocale("en")}
                className={`rounded-full px-2.5 py-1.5 transition sm:px-3 ${locale === "en" ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                aria-pressed={locale === "en"}
              >
                EN
              </button>
            </div>
            <Link
              href="/login?install=1"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 sm:text-sm"
            >
              {t("nav.install")}
            </Link>
            <Link href="/login" className="btn-primary px-3 py-2 text-xs sm:text-sm">
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 px-4 pb-20 pt-12 text-white sm:pt-16 md:pb-28 md:pt-20">
        <div
          className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-blue-500/40 blur-3xl animate-landing-float"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-indigo-500/35 blur-3xl animate-landing-float [animation-delay:1.2s]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[120%] -translate-x-1/2 rounded-[100%] bg-cyan-400/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl">
          <div className="landing-reveal mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-100 backdrop-blur-md">
            <IconSpark />
            {t("hero.badge")}
          </div>
          <h1 className="landing-reveal max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl [animation-delay:80ms]">
            <span className="bg-gradient-to-r from-white via-blue-100 to-cyan-100 bg-clip-text text-transparent">
              {t("hero.title")}
            </span>
          </h1>
          <p className="landing-reveal mt-6 max-w-2xl text-lg leading-relaxed text-blue-100/90 sm:text-xl [animation-delay:140ms]">
            {t("hero.subtitle")}
          </p>

          <div className="landing-reveal mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center [animation-delay:200ms]">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-400 hover:shadow-emerald-500/40"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t("hero.ctaPrimary")}
              </a>
            ) : null}
            <a
              href="#contacto"
              className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              {t("hero.ctaSecondary")}
            </a>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-6 py-3.5 text-base font-semibold text-white/95 transition hover:bg-white/10"
            >
              {t("hero.ctaLogin")}
            </Link>
            <Link
              href="/login?install=1"
              className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-6 py-3.5 text-base font-semibold text-white/95 transition hover:bg-white/10 sm:hidden"
            >
              {t("nav.install")}
            </Link>
          </div>

          <div className="landing-reveal mt-14 grid gap-4 sm:grid-cols-3 [animation-delay:260ms]">
            {[
              { k: "stats.qr" as const, icon: "qr" },
              { k: "stats.push" as const, icon: "bell" },
              { k: "stats.pdf" as const, icon: "doc" },
            ].map((item) => (
              <div
                key={item.k}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-2 text-blue-200/90">
                  {item.icon === "qr" ? (
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm14 0h2v2h-2v-2Zm-4 0h2v2h-2v-2Zm-2 4h2v2h-2v-2Zm4 0h2v2h-2v-2Z" fill="currentColor" />
                    </svg>
                  ) : item.icon === "bell" ? (
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2V19h16v-1l-2-2Z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 2h9l3 3v17H6V2Z" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-semibold text-white">{t(item.k)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200/80 bg-white/90 py-4 backdrop-blur">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{t("marquee.title")}</p>
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-landing-marquee gap-3 pr-3 motion-reduce:animate-none">
            {marqueeTrack.map((label, i) => (
              <span
                key={`${label}-${i}`}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm sm:text-sm"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{t("feat.mainTitle")}</h2>
          <p className="mt-4 text-lg text-slate-600">{t("feat.mainSubtitle")}</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {(
            [
              { title: "feat.res.title", desc: "feat.res.desc", accent: "from-blue-500 to-indigo-600" },
              { title: "feat.guard.title", desc: "feat.guard.desc", accent: "from-emerald-500 to-teal-600" },
              { title: "feat.admin.title", desc: "feat.admin.desc", accent: "from-violet-500 to-purple-600" },
            ] as const
          ).map((card) => (
            <article
              key={card.title}
              className="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-lg shadow-slate-200/50 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-200/40"
            >
              <div
                className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${card.accent} opacity-20 blur-2xl transition group-hover:opacity-35`}
                aria-hidden
              />
              <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br ${card.accent} p-3 text-white shadow-md`}>
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 3 4 9v12h16V9l-8-6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900">{t(card.title)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{t(card.desc)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50/90 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-extrabold text-slate-900 md:text-4xl">{t("how.title")}</h2>
          <div className="mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
            {(
              [
                { step: "1", title: "how.s1t", desc: "how.s1d" },
                { step: "2", title: "how.s2t", desc: "how.s2d" },
                { step: "3", title: "how.s3t", desc: "how.s3d" },
                { step: "4", title: "how.s4t", desc: "how.s4d" },
              ] as const
            ).map((row) => (
              <div key={row.step} className="relative text-center md:text-left">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-600/30 md:mx-0">
                  {row.step}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{t(row.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{t(row.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <h2 className="text-center text-3xl font-extrabold text-slate-900">{t("trust.title")}</h2>
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4">
          {(["trust.t1", "trust.t2", "trust.t3", "trust.t4"] as const).map((key) => (
            <li
              key={key}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-sm leading-relaxed text-slate-700">{t(key)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 px-4 py-16 text-center text-white md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_50%)]" aria-hidden />
        <div className="relative mx-auto max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{t("ctaBand.title")}</h2>
          <p className="mt-4 text-lg text-blue-100">{t("ctaBand.sub")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-blue-800 shadow-xl transition hover:bg-blue-50 sm:w-auto"
              >
                {t("hero.ctaPrimary")}
              </a>
            ) : null}
            <a
              href="#contacto"
              className="inline-flex w-full items-center justify-center rounded-2xl border-2 border-white/70 px-8 py-3.5 text-base font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              {t("hero.ctaSecondary")}
            </a>
          </div>
        </div>
      </section>

      <section id="contacto" className="scroll-mt-28 bg-slate-50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 md:text-4xl">{t("contact.title")}</h2>
            <p className="mt-3 text-lg text-slate-600">{t("contact.sub")}</p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
              <LeadForm locale={locale} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 md:p-8">
                <h3 className="text-lg font-bold text-emerald-950">{t("contact.whatsappCard")}</h3>
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:bg-emerald-500"
                  >
                    {t("contact.whatsappBtn")}
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-emerald-900/80">{t("contact.whatsappOff")}</p>
                )}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-md md:p-8">
                <p className="font-semibold text-slate-900">{t("contact.noteTitle")}</p>
                <p className="mt-2 leading-relaxed">{t("contact.noteBody")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white px-4 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-lg font-bold text-slate-900">{t("bottom.readyTitle")}</p>
            <p className="mt-1 text-sm text-slate-600">{t("bottom.readySub")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login?install=1" className="rounded-2xl border border-slate-300 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-100">
              {t("bottom.install")}
            </Link>
            <Link href="/login" className="btn-primary px-6 py-3 text-sm">
              {t("bottom.login")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
