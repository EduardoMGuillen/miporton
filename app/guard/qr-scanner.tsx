"use client";

import { useEffect, useMemo, useState } from "react";

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
  const scannerId = useMemo(() => `qr-reader-${Math.random().toString(36).slice(2)}`, []);

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
      return;
    }

    const payload = (await response.json()) as ScanResult;
    setResult(payload);
  }

  useEffect(() => {
    let cleanup: (() => Promise<void>) | undefined;

    async function mountScanner() {
      const html5QrCodeModule = await import("html5-qrcode");
      const Html5Qrcode = html5QrCodeModule.Html5Qrcode;
      const scanner = new Html5Qrcode(scannerId);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 5, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await scanner.stop();
          await validateCode(decodedText);
        },
        () => {},
      );

      cleanup = async () => {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
      };
    }

    mountScanner().catch(() => {
      setError("No se pudo iniciar la camara. Usa validacion manual.");
    });

    return () => {
      if (cleanup) {
        cleanup().catch(() => {});
      }
    };
  }, [scannerId]);

  return (
    <div className="space-y-4">
      <div id={scannerId} className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50" />

      <form
        onSubmit={async (event) => {
          event.preventDefault();
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
        <button className="btn-primary">
          Validar manual
        </button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <div
          className={`rounded-xl border p-4 text-sm ${
            result.valid
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-red-300 bg-red-50 text-red-900"
          }`}
        >
          <p className="font-semibold">{result.valid ? "QR VALIDO" : "QR INVALIDO"}</p>
          <p>{result.reason}</p>
          {result.visitorName ? <p>Visita: {result.visitorName}</p> : null}
          {result.residentName ? <p>Anunciado por: {result.residentName}</p> : null}
          {result.residentialName ? <p>Residencial: {result.residentialName}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
