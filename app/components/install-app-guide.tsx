"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  const standaloneFromMedia = window.matchMedia("(display-mode: standalone)").matches;
  const standaloneFromNavigator = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return standaloneFromMedia || standaloneFromNavigator;
}

export function InstallAppGuide({
  compact = false,
  initialOpen = false,
}: {
  compact?: boolean;
  initialOpen?: boolean;
}) {
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
      setFeedback("La app ya se instalo en tu dispositivo.");
    };

    setIsInstalled(isInStandaloneMode());
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (initialOpen) {
      setIsOpen(true);
    }
  }, [initialOpen]);

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
        setFeedback("Instalacion iniciada correctamente.");
      } else {
        setFeedback("La instalacion fue cancelada.");
      }
    } finally {
      setInstallPrompt(null);
      setIsInstalling(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          compact
            ? "rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        }
      >
        Instalar app
      </button>

      {isClient && isOpen
        ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">Agregar MiVisita a inicio</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700"
              >
                Cerrar
              </button>
            </div>

            <p className="text-sm text-slate-600">
              En Android podemos intentar instalacion automatica. En iOS se hace desde compartir.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Instalacion automatica (si esta disponible)</p>
              <button
                type="button"
                onClick={() => handleInstallNow().catch(() => {})}
                disabled={!canAutoInstall || isInstalling}
                className="mt-2 rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isInstalling ? "Instalando..." : "Instalar automaticamente"}
              </button>
              {!canAutoInstall ? (
                <p className="mt-2 text-xs text-slate-500">
                  Tu navegador no expuso el prompt automatico en este momento.
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">Android (Chrome/Edge)</p>
                <ol className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>1. Abre MiVisita en el navegador.</li>
                  <li>2. Toca el menu del navegador (3 puntos).</li>
                  <li>3. Pulsa &quot;Instalar app&quot; o &quot;Agregar a pantalla de inicio&quot;.</li>
                  <li>4. Confirma para crear el icono en Home.</li>
                </ol>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-900">iPhone / iPad (Safari)</p>
                <ol className="mt-2 space-y-1 text-xs text-slate-600">
                  <li>1. Abre MiVisita en Safari.</li>
                  <li>2. Pulsa el boton Compartir.</li>
                  <li>3. Selecciona &quot;Agregar a pantalla de inicio&quot;.</li>
                  <li>4. Confirma en &quot;Agregar&quot;.</li>
                </ol>
                {showIosGuide ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    En iOS no existe instalacion automatica completa desde web app.
                  </p>
                ) : null}
              </div>
            </div>

            {isInstalled ? (
              <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Esta app ya esta instalada en este dispositivo.
              </p>
            ) : null}
            {feedback ? <p className="mt-3 text-xs text-slate-600">{feedback}</p> : null}
          </div>
        </div>,
          document.body,
        )
        : null}
    </div>
  );
}
