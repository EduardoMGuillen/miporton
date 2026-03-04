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
  const [isStarting, setIsStarting] = useState(false);
  const scannerId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2)}`, []);
  const scannerRef = useRef<any | null>(null);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);

  const validateCode = useCallback(async (code: string) => {
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
  }, []);

  const stopAndClearScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;

    if (scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }
    await Promise.resolve(scanner.clear()).catch(() => {});
    scannerRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
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
        if (processingRef.current) return;
        processingRef.current = true;
        setIsProcessing(true);
        await scanner.stop().catch(() => {});
        await validateCode(decodedText);
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
        const backCamera =
          cameras.find((camera) => /back|rear|environment|trasera/i.test(camera.label)) ??
          cameras[0];
        if (!backCamera) {
          throw new Error("No camera found");
        }
        await scanner.start(
          backCamera.id,
          { fps: 6, qrbox: { width: 240, height: 240 } },
          onSuccess,
          () => {},
        );
      }
    } catch {
      setError("No se pudo iniciar la camara. Usa 'Iniciar/Reactivar camara'.");
    } finally {
      processingRef.current = false;
      setIsStarting(false);
    }
  }, [isStarting, scannerId, stopAndClearScanner, validateCode]);

  useEffect(() => {
    mountedRef.current = true;
    startCamera().catch(() => {});

    return () => {
      mountedRef.current = false;
      stopAndClearScanner().catch(() => {});
    };
  }, [startCamera, stopAndClearScanner]);

  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState === "visible" && !result) {
        await startCamera().catch(() => {});
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [result]);

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
          await stopAndClearScanner();
          processingRef.current = false;
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
            startCamera().catch(() => {});
          }}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
        >
          {isStarting ? "Iniciando..." : "Iniciar/Reactivar camara"}
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
                processingRef.current = false;
                await startCamera().catch(() => {});
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
