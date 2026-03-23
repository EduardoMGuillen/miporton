"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";

type ScanResult = {
  valid: boolean;
  reason: string;
  visitorName?: string | null;
  visitorDescription?: string | null;
  hasVehicle?: boolean;
  residentName?: string | null;
  residentialName?: string | null;
  residentId?: string | null;
};
type ScanMode = "entry" | "exit";

const MAX_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;

function fileNameToJpeg(name: string) {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return `${name}.jpg`;
  return `${name.slice(0, lastDot)}.jpg`;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("No se pudo leer la imagen."));
    };
    image.src = imageUrl;
  });
}

async function canvasToJpegBlob(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la compresion de imagen.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
  });
  if (!blob) throw new Error("No se pudo convertir la imagen.");
  return blob;
}

async function optimizeImageForUpload(file: File, maxBytes = MAX_IMAGE_UPLOAD_BYTES): Promise<File> {
  if (file.size > 0 && file.size <= maxBytes && file.type === "image/jpeg") {
    return file;
  }

  const image = await loadImageElement(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const initialScale = longestSide > 1920 ? 1920 / longestSide : 1;
  let scale = initialScale;
  let quality = 0.86;
  let bestBlob: Blob | null = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const candidateBlob = await canvasToJpegBlob(image, width, height, quality);
    bestBlob = candidateBlob;
    if (candidateBlob.size <= maxBytes) {
      return new File([candidateBlob], fileNameToJpeg(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }

    if (quality > 0.5) {
      quality -= 0.12;
    } else {
      scale *= 0.82;
      quality = Math.max(0.44, quality - 0.04);
    }
  }

  if (!bestBlob) {
    throw new Error("No se pudo optimizar la imagen.");
  }

  return new File([bestBlob], fileNameToJpeg(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

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
  const [platePhotoFile, setPlatePhotoFile] = useState<File | null>(null);
  const [preferredFacing, setPreferredFacing] = useState<"environment" | "user">("environment");
  const [scanMode, setScanMode] = useState<ScanMode>("entry");
  const scannerId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2)}`, []);
  const scannerRef = useRef<ScannerInstance | null>(null);
  const isHandlingRef = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const handledManualCodeRef = useRef<string | null>(null);

  async function validateCode(code: string, mode: ScanMode) {
    setError(null);
    setIdCaptureError(null);
    const endpoint = mode === "entry" ? "/api/guard/scan" : "/api/guard/scan-exit";
    const response = await fetch(endpoint, {
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
    if (payload.valid && mode === "entry") {
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
    if (pendingResult?.hasVehicle && !platePhotoFile) {
      setIdCaptureError("Debes tomar o seleccionar una foto de la placa.");
      return;
    }

    setIsSubmittingIdPhoto(true);
    setIdCaptureError(null);
    setError(null);

    try {
      const optimizedIdPhoto = await optimizeImageForUpload(idPhotoFile);
      const optimizedPlatePhoto = platePhotoFile
        ? await optimizeImageForUpload(platePhotoFile)
        : null;

      const formData = new FormData();
      formData.append("code", pendingScannedCode);
      formData.append("idPhoto", optimizedIdPhoto);
      if (optimizedPlatePhoto) {
        formData.append("platePhoto", optimizedPlatePhoto);
      }

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
      setPlatePhotoFile(null);
      setPendingScannedCode(null);
      setPendingResult(null);
      setResult(payload as ScanResult);
      isHandlingRef.current = false;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrio un error enviando la foto del ID.";
      setIdCaptureError(message);
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

      const activeMode = scanMode;
      const onSuccess = async (decodedText: string) => {
        if (isHandlingRef.current) return;
        isHandlingRef.current = true;
        await scanner.stop().catch(() => {});
        await validateCode(decodedText, activeMode);
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
    const manualCode = searchParams.get("manualCode")?.trim();
    if (!manualCode) {
      handledManualCodeRef.current = null;
      return;
    }
    if (handledManualCodeRef.current === manualCode) return;
    handledManualCodeRef.current = manualCode;

    setResult(null);
    setError(null);
    setIdCaptureError(null);
    setScanMode("entry");
    validateCode(manualCode, "entry").catch(() => {
      setError("No se pudo validar el QR manual.");
    });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("manualCode");
    const nextPath = nextParams.toString() ? `/guard?${nextParams.toString()}` : "/guard";
    router.replace(nextPath);
  }, [router, searchParams]);

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
  const successTitle =
    result?.valid && result.reason.toLowerCase().includes("salida")
      ? "SALIDA REGISTRADA"
      : "QR VALIDO";

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-2">
        <button
          onClick={() => {
            isHandlingRef.current = false;
            setError(null);
            setScanMode("entry");
            setIsScannerOpen(true);
          }}
          className="w-full rounded-2xl bg-blue-700 px-5 py-4 text-base font-bold text-white shadow-lg transition hover:bg-blue-800"
        >
          Escanear Entrada
        </button>
        <button
          onClick={() => {
            isHandlingRef.current = false;
            setError(null);
            setScanMode("exit");
            setIsScannerOpen(true);
          }}
          className="w-full rounded-2xl bg-slate-800 px-5 py-4 text-base font-bold text-white shadow-lg transition hover:bg-slate-900"
        >
          Escanear Salida
        </button>
      </div>
      <p className="text-center text-xs text-slate-500">
        Entrada solicita foto del ID. Salida solo registra la hora de salida.
      </p>

      {isClient && isScannerOpen
        ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {scanMode === "entry" ? "Escaneo de entrada" : "Escaneo de salida"}
              </h3>
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
            {pendingResult?.visitorDescription ? (
              <p className="text-sm text-slate-700">Descripcion: {pendingResult.visitorDescription}</p>
            ) : null}
            {pendingResult?.residentName ? (
              <p className="text-sm text-slate-700">Anunciado por: {pendingResult.residentName}</p>
            ) : null}
            {pendingResult?.hasVehicle ? (
              <p className="text-sm font-semibold text-amber-700">
                Esta visita es de tipo Vehiculo (foto de placa obligatoria).
              </p>
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
            <p className="mt-2 text-xs text-slate-500">
              Formatos: JPG, PNG o WEBP. Maximo 5MB por archivo (se optimiza automaticamente antes de enviar).
            </p>

            {pendingResult?.hasVehicle ? (
              <>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Foto de placa
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  onChange={(event) => setPlatePhotoFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />
              </>
            ) : null}
            {idCaptureError ? <p className="mt-2 text-sm text-red-600">{idCaptureError}</p> : null}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setIsIdCaptureOpen(false);
                  setIdPhotoFile(null);
                  setPlatePhotoFile(null);
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
                ? successTitle
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
