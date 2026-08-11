"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

type PatrolScanResult = {
  ok: boolean;
  reason: string;
  zoneName?: string;
  checkedAt?: string;
};

export function GuardPatrolScanner() {
  type ScannerInstance = {
    isScanning?: boolean;
    stop: () => Promise<unknown>;
    clear: () => unknown;
  };

  const router = useRouter();
  const scannerDomId = useId().replace(/:/g, "");
  const scannerId = `patrol-scanner-${scannerDomId}`;
  const scannerRef = useRef<ScannerInstance | null>(null);
  const isHandlingRef = useRef(false);

  const [isClient, setIsClient] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PatrolScanResult | null>(null);

  async function stopAndClearScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    if (scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }
    await Promise.resolve(scanner.clear()).catch(() => {});
    scannerRef.current = null;
  }

  async function submitCode(decodedText: string) {
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/guard/patrol-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: decodedText }),
      });
      const data = (await response.json()) as PatrolScanResult & { error?: string };
      if (!response.ok && data.error && !data.reason) {
        setResult({ ok: false, reason: data.error });
        return;
      }
      setResult({
        ok: Boolean(data.ok),
        reason: data.reason ?? (data.ok ? "Patrullaje registrado." : "No se pudo registrar."),
        zoneName: data.zoneName,
        checkedAt: data.checkedAt,
      });
      if (data.ok) router.refresh();
    } catch {
      setError("No se pudo registrar el patrullaje. Intenta de nuevo.");
    }
  }

  async function startCamera() {
    if (isStarting) return;
    setIsStarting(true);
    setError(null);

    try {
      await stopAndClearScanner();
      const html5QrCodeModule = await import("html5-qrcode");
      const Html5Qrcode = html5QrCodeModule.Html5Qrcode;
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      const onSuccess = async (decodedText: string) => {
        if (isHandlingRef.current) return;
        isHandlingRef.current = true;
        await scanner.stop().catch(() => {});
        setIsScannerOpen(false);
        await submitCode(decodedText);
        isHandlingRef.current = false;
      };

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 6, qrbox: { width: 240, height: 240 } },
          onSuccess,
          () => {},
        );
      } catch {
        const cameras = await html5QrCodeModule.Html5Qrcode.getCameras();
        const preferredCamera =
          cameras.find((camera) => /back|rear|environment|trasera/i.test(camera.label)) ?? cameras[0];
        if (!preferredCamera) throw new Error("No camera found");
        await scanner.start(
          preferredCamera.id,
          { fps: 6, qrbox: { width: 240, height: 240 } },
          onSuccess,
          () => {},
        );
      }
    } catch {
      setError("No se pudo iniciar la camara. Verifica permisos y vuelve a intentar.");
      setIsScannerOpen(false);
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isScannerOpen) {
      const timer = setTimeout(() => {
        startCamera().catch(() => {});
      }, 50);
      return () => {
        clearTimeout(timer);
        stopAndClearScanner().catch(() => {});
      };
    }

    stopAndClearScanner().catch(() => {});
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScannerOpen]);

  const checkedAtLabel =
    result?.checkedAt && !Number.isNaN(Date.parse(result.checkedAt))
      ? formatDateTimeTegucigalpa(new Date(result.checkedAt))
      : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Escanea el sticker QR de la zona (prefijo MPP). No usa el flujo de visitas.
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={isStarting}
        onClick={() => {
          isHandlingRef.current = false;
          setIsScannerOpen(true);
        }}
      >
        {isStarting ? "Abriendo camara..." : "Escanear zona QR"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div
          className={`rounded-xl border p-4 ${
            result.ok
              ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
              : "border-red-200 bg-red-50/70 text-red-800"
          }`}
        >
          <p className="font-semibold">{result.ok ? "Patrullaje guardado" : "No registrado"}</p>
          {result.zoneName ? <p className="text-sm">Zona: {result.zoneName}</p> : null}
          {checkedAtLabel ? <p className="text-sm">Hora: {checkedAtLabel}</p> : null}
          <p className="text-sm">{result.reason}</p>
        </div>
      ) : null}

      {isClient && isScannerOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
              <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">Escanear zona de patrullaje</h3>
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-600 hover:text-slate-900"
                    onClick={() => setIsScannerOpen(false)}
                  >
                    Cerrar
                  </button>
                </div>
                <div id={scannerId} className="overflow-hidden rounded-xl bg-slate-900" />
                <p className="mt-3 text-xs text-slate-500">
                  Apunta al QR del sticker. Se registrara automaticamente al leerlo.
                </p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
