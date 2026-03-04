"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type ScanResult = {
  valid: boolean;
  reason: string;
  visitorName?: string | null;
  residentName?: string | null;
  residentialName?: string | null;
};

export function GuardQrScanner() {
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2)}`, []);
  const scannerRef = useRef<{
    start: (...args: any[]) => Promise<any>;
    stop: () => Promise<void>;
    clear: () => void | Promise<void>;
    isScanning: boolean;
  } | null>(null);
  const mountedRef = useRef(true);

  const startCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || scanner.isScanning) return;

    await scanner.start(
      { facingMode: "environment" },
      { fps: 6, qrbox: { width: 240, height: 240 } },
      async (decodedText: string) => {
        if (isProcessing) return;
        setIsProcessing(true);
        await scanner.stop();
        await validateCode(decodedText);
      },
      () => {},
    );
  }, [isProcessing]);

  const recreateAndStartCamera = useCallback(async () => {
    const existing = scannerRef.current;
    if (existing) {
      if (existing.isScanning) {
        await existing.stop().catch(() => {});
      }
      await Promise.resolve(existing.clear()).catch(() => {});
    }

    const html5QrCodeModule = await import("html5-qrcode");
    const Html5Qrcode = html5QrCodeModule.Html5Qrcode;
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await startCamera();
        return;
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
    throw lastError;
  }, [scannerId, startCamera]);

  async function validateCode(code: string) {
    setError(null);
    const response = await fetch("/api/guard/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "No se pudo validar el QR.");
      setIsProcessing(false);
      return;
    }

    const payload = (await response.json()) as ScanResult;
    setResult(payload);
    setIsProcessing(false);
  }

  useEffect(() => {
    mountedRef.current = true;
    recreateAndStartCamera().catch(() => {
      setError("No se pudo iniciar la camara. Cierra y abre la app o usa 'Reactivar camara'.");
    });

    return () => {
      mountedRef.current = false;
      const scanner = scannerRef.current;
      if (!scanner) return;
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
      Promise.resolve(scanner.clear()).catch(() => {});
    };
  }, [recreateAndStartCamera]);

  const resultTone =
    result && !result.valid && result.reason.toLowerCase().includes("utilizado")
      ? "used"
      : result?.valid
        ? "valid"
        : "invalid";

  return (
    <div className="space-y-4">
      <div id={scannerId} className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50" />

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!manualCode.trim()) return;
          const scanner = scannerRef.current;
          if (scanner?.isScanning) {
            await scanner.stop().catch(() => {});
          }
          await validateCode(manualCode);
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          placeholder="MP:codigo o codigo"
          className="field-base min-w-64 flex-1"
        />
        <button className="btn-primary" disabled={isProcessing}>
          {isProcessing ? "Validando..." : "Validar manual"}
        </button>
        <button
          type="button"
          onClick={() => {
            recreateAndStartCamera().catch(() => {
              setError("No se pudo reiniciar la camara.");
            });
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Reactivar camara
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div
            className={`w-full max-w-md rounded-2xl border p-6 text-center shadow-2xl ${
              resultTone === "valid"
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : resultTone === "used"
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            <p className="text-2xl font-bold">
              {resultTone === "valid"
                ? "QR VALIDO"
                : resultTone === "used"
                  ? "QR YA UTILIZADO"
                  : "QR INVALIDO"}
            </p>
            <p className="mt-2 text-sm">{result.reason}</p>
            {result.visitorName ? <p className="mt-3 text-sm">Visita: {result.visitorName}</p> : null}
            {result.residentName ? <p className="text-sm">Anunciado por: {result.residentName}</p> : null}
            {result.residentialName ? <p className="text-sm">Residencial: {result.residentialName}</p> : null}

            <button
              onClick={async () => {
                setResult(null);
                setManualCode("");
                setError(null);
                if (!mountedRef.current) return;
                await recreateAndStartCamera().catch(() => {
                  setError("No se pudo reiniciar la camara.");
                });
              }}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Escanear otro QR
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
