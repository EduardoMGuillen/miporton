"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ScanResult = {
  valid: boolean;
  reason: string;
  visitorName?: string | null;
  residentName?: string | null;
  residentialName?: string | null;
  residentId?: string | null;
};

export function GuardQrScanner() {
  type ScannerInstance = {
    isScanning?: boolean;
    stop: () => Promise<unknown>;
    clear: () => unknown;
  };

  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idCaptureError, setIdCaptureError] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isIdCaptureOpen, setIsIdCaptureOpen] = useState(false);
  const [isSubmittingIdPhoto, setIsSubmittingIdPhoto] = useState(false);
  const [pendingScannedCode, setPendingScannedCode] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<ScanResult | null>(null);
  const [idPhotoFile, setIdPhotoFile] = useState<File | null>(null);
  const [preferredFacing, setPreferredFacing] = useState<"environment" | "user">("environment");
  const scannerId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2)}`, []);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const isHandlingRef = useRef(false);
  const [isClient, setIsClient] = useState(false);

  async function validateCode(code: string) {
    setError(null);
    setIdCaptureError(null);
    const response = await fetch("/api/guard/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "No se pudo validar el QR.");
      return;
    }

    const payload = (await response.json()) as ScanResult;
    if (payload.valid) {
      setPendingScannedCode(code);
      setPendingResult(payload);
      setIsIdCaptureOpen(true);
      return;
    }
    setResult(payload);
  }

  async function submitIdPhoto() {
    if (!pendingScannedCode) {
      setIdCaptureError("No hay un QR pendiente por completar.");
      return;
    }
    if (!idPhotoFile) {
      setIdCaptureError("Debes tomar o seleccionar una foto del ID.");
      return;
    }

    setIsSubmittingIdPhoto(true);
    setIdCaptureError(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("code", pendingScannedCode);
      formData.append("idPhoto", idPhotoFile);

      const response = await fetch("/api/guard/scan-with-id", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | (ScanResult & { error?: string })
        | null;

      if (!response.ok) {
        setIdCaptureError(payload?.error ?? "No se pudo completar el ingreso con foto del ID.");
        return;
      }

      setIsIdCaptureOpen(false);
      setIdPhotoFile(null);
      setPendingScannedCode(null);
      setPendingResult(null);
      setResult(payload as ScanResult);
      isHandlingRef.current = false;
    } catch {
      setIdCaptureError("Ocurrio un error enviando la foto del ID.");
    } finally {
      setIsSubmittingIdPhoto(false);
    }
  }

  async function stopAndClearScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    if (scanner.isScanning) {
      await scanner.stop().catch(() => {});
    }
    await Promise.resolve(scanner.clear()).catch(() => {});
    scannerRef.current = null;
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
        await validateCode(decodedText);
        setIsScannerOpen(false);
      };

      try {
        await scanner.start(
          { facingMode: preferredFacing },
          { fps: 6, qrbox: { width: 240, height: 240 } },
          onSuccess,
          () => {},
        );
      } catch {
        const cameras = await html5QrCodeModule.Html5Qrcode.getCameras();
        const preferredCamera =
          preferredFacing === "environment"
            ? cameras.find((camera) => /back|rear|environment|trasera/i.test(camera.label))
            : cameras.find((camera) => /front|user|frontal|selfie/i.test(camera.label));
        const cameraToUse =
          preferredCamera ??
          (preferredFacing === "environment"
            ? cameras.find((camera) => /front|user|frontal|selfie/i.test(camera.label))
            : cameras.find((camera) => /back|rear|environment|trasera/i.test(camera.label))) ??
          cameras[0];
        if (!cameraToUse) throw new Error("No camera found");
        await scanner.start(
          cameraToUse.id,
          { fps: 6, qrbox: { width: 240, height: 240 } },
          onSuccess,
          () => {},
        );
      }
    } catch {
      setError("No se pudo iniciar la camara. Verifica permisos y vuelve a intentar.");
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

  const resultTone =
    result && !result.valid && result.reason.toLowerCase().includes("utilizado")
      ? "used"
      : result?.valid
        ? "valid"
        : "invalid";

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          isHandlingRef.current = false;
          setError(null);
          setIsScannerOpen(true);
        }}
        className="w-full rounded-2xl bg-blue-700 px-5 py-5 text-lg font-bold text-white shadow-lg transition hover:bg-blue-800"
      >
        Escanear QR
      </button>
      <p className="text-center text-xs text-slate-500">
        El ingreso se completara cuando tomes la foto del ID del visitante.
      </p>

      {isClient && isScannerOpen
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Escaneo de acceso</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const nextFacing = preferredFacing === "environment" ? "user" : "environment";
                    setPreferredFacing(nextFacing);
                    setTimeout(() => {
                      startCamera().catch(() => {});
                    }, 50);
                  }}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-100"
                >
                  Cambiar camara
                </button>
                <button
                  onClick={() => setIsScannerOpen(false)}
                  className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div id={scannerId} className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50" />
            <button
              onClick={() => startCamera().catch(() => {})}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              {isStarting ? "Iniciando camara..." : "Reintentar camara"}
            </button>
          </div>
        </div>,
          document.body,
        )
        : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {isClient && isIdCaptureOpen
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900">Capturar ID del visitante</h3>
            <p className="mt-1 text-sm text-slate-600">
              Toma o carga una foto del documento para completar el ingreso.
            </p>
            {pendingResult?.visitorName ? (
              <p className="mt-3 text-sm text-slate-700">Visita: {pendingResult.visitorName}</p>
            ) : null}
            {pendingResult?.residentName ? (
              <p className="text-sm text-slate-700">Anunciado por: {pendingResult.residentName}</p>
            ) : null}

            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Foto del ID
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(event) => setIdPhotoFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            />
            <p className="mt-2 text-xs text-slate-500">Formatos: JPG, PNG o WEBP. Maximo 5MB.</p>
            {idCaptureError ? <p className="mt-2 text-sm text-red-600">{idCaptureError}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setIsIdCaptureOpen(false);
                  setIdPhotoFile(null);
                  setPendingScannedCode(null);
                  setPendingResult(null);
                  setIdCaptureError(null);
                  isHandlingRef.current = false;
                }}
                className="w-1/2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => submitIdPhoto().catch(() => {})}
                disabled={isSubmittingIdPhoto}
                className="w-1/2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
              >
                {isSubmittingIdPhoto ? "Guardando..." : "Completar ingreso"}
              </button>
            </div>
          </div>
        </div>,
          document.body,
        )
        : null}

      {isClient && result
        ? createPortal(
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
              onClick={() => {
                setResult(null);
                isHandlingRef.current = false;
              }}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Cerrar resultado
            </button>
            <button
              onClick={() => {
                setResult(null);
                isHandlingRef.current = false;
                setIsScannerOpen(true);
              }}
              className="mt-2 w-full rounded-lg border border-slate-400 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              Escanear otro QR
            </button>
          </div>
        </div>,
          document.body,
        )
        : null}
    </div>
  );
}
