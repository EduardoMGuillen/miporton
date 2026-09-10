"use client";

import { useEffect, useMemo, useState } from "react";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.mivisita.app&pcampaignid=web_share";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  const standaloneFromMedia = window.matchMedia("(display-mode: standalone)").matches;
  const standaloneFromNavigator = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return standaloneFromMedia || standaloneFromNavigator;
}

/** Panel PWA (instalación web) para usar dentro de un desplegable. */
export function InstallAppPanel() {
  const [installPrompt, setInstallPrompt] = useState<DeferredPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as DeferredPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setFeedback("La app ya se instaló en tu dispositivo.");
    };

    setIsInstalled(isInStandaloneMode());
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canAutoInstall = Boolean(installPrompt) && !isInstalled;
  const showIosGuide = useMemo(() => isIosDevice() && !canAutoInstall, [canAutoInstall]);

  async function handleInstallNow() {
    if (!installPrompt) return;
    setIsInstalling(true);
    setFeedback(null);

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setFeedback("Instalación iniciada correctamente.");
      } else {
        setFeedback("La instalación fue cancelada.");
      }
    } finally {
      setInstallPrompt(null);
      setIsInstalling(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        También puedes instalar MiVisita como app web (PWA) desde el navegador.
      </p>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-900">Instalación automática</p>
        <button
          type="button"
          onClick={() => handleInstallNow().catch(() => {})}
          disabled={!canAutoInstall || isInstalling}
          className="mt-2 min-h-10 w-full rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isInstalling ? "Instalando..." : "Instalar automáticamente"}
        </button>
        {!canAutoInstall ? (
          <p className="mt-2 text-xs text-slate-500">
            Tu navegador no expuso el prompt automático en este momento. Usa los pasos de abajo.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">Android (Chrome/Edge)</p>
          <ol className="mt-2 space-y-1 text-xs text-slate-600">
            <li>1. Abre MiVisita en el navegador.</li>
            <li>2. Toca el menú del navegador (3 puntos).</li>
            <li>3. Pulsa &quot;Instalar app&quot; o &quot;Agregar a pantalla de inicio&quot;.</li>
            <li>4. Confirma para crear el icono en Home.</li>
          </ol>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">iPhone / iPad (Safari)</p>
          <ol className="mt-2 space-y-1 text-xs text-slate-600">
            <li>1. Abre MiVisita en Safari.</li>
            <li>2. Pulsa el botón Compartir.</li>
            <li>3. Selecciona &quot;Agregar a pantalla de inicio&quot;.</li>
            <li>4. Confirma en &quot;Agregar&quot;.</li>
          </ol>
          {showIosGuide ? (
            <p className="mt-2 text-[11px] text-slate-500">
              En iOS la instalación web se hace desde Compartir.
            </p>
          ) : null}
        </div>
      </div>

      {isInstalled ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Esta app ya está instalada en este dispositivo.
        </p>
      ) : null}
      {feedback ? <p className="text-xs text-slate-600">{feedback}</p> : null}
    </div>
  );
}

type LoginDownloadSectionProps = {
  initialOtherOpen?: boolean;
};

export function LoginDownloadSection({ initialOtherOpen = false }: LoginDownloadSectionProps) {
  const [platform, setPlatform] = useState<"android" | "ios" | "other">("other");
  const [otherOpen, setOtherOpen] = useState(initialOtherOpen);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isAndroidDevice()) setPlatform("android");
    else if (isIosDevice()) setPlatform("ios");
    else setPlatform("other");
  }, []);

  useEffect(() => {
    if (initialOtherOpen) setOtherOpen(true);
  }, [initialOtherOpen]);

  function handlePrimaryDownload() {
    if (platform === "android") {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    if (platform === "ios") {
      setIosHint(true);
      return;
    }
    // Desktop / otros: Play Store como destino principal de la app nativa.
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
  }

  const primaryLabel =
    platform === "ios"
      ? "Descarga la APP — Coming soon"
      : platform === "android"
        ? "Descarga la APP"
        : "Descarga la APP (Android)";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handlePrimaryDownload}
        disabled={platform === "ios"}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#01875f] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#016b4c] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3.18 23.04 12.9 12.3 3.18 1.56A2.4 2.4 0 0 0 2 3.5v17a2.4 2.4 0 0 0 1.18 2.54Zm11.18-11.18 2.4 2.4 3.7-2.1a1.6 1.6 0 0 0 0-2.8l-3.7-2.1-2.4 2.4Zm-1.3 1.3L3.9 22.3l11.5-6.54-2.34-2.6Zm0-2.6 2.34-2.6L3.9 1.7l9.16 9.16Z"
          />
        </svg>
        {primaryLabel}
      </button>

      {platform === "ios" || iosHint ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          La app de iOS llega pronto. Mientras tanto, usa &quot;Otras opciones de descarga&quot; para
          agregarla a tu pantalla de inicio desde Safari.
        </p>
      ) : null}

      {platform === "other" ? (
        <p className="text-center text-[11px] text-slate-500">
          Disponible en{" "}
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-700 underline-offset-2 hover:underline"
          >
            Google Play
          </a>
          . iOS: coming soon.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80">
        <button
          type="button"
          onClick={() => setOtherOpen((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          aria-expanded={otherOpen}
        >
          <span>Otras opciones de descarga</span>
          <span
            className={`inline-block text-slate-500 transition ${otherOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>
        {otherOpen ? (
          <div className="border-t border-slate-200 px-4 py-4">
            <InstallAppPanel />
          </div>
        ) : null}
      </div>
    </div>
  );
}
