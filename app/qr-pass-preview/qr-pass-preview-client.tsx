"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { buildVisitStickerPngBlob } from "@/app/resident/qr-share-actions";
import { residentT } from "@/app/resident/resident-dictionary";

export function QrPassPreviewClient() {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;

    void (async () => {
      try {
        const t = (key: string) => residentT("es", key);
        const qrDataUrl = await QRCode.toDataURL("MP:EJEMPLO179413181110277", {
          margin: 1,
          width: 640,
          errorCorrectionLevel: "M",
        });
        const blob = await buildVisitStickerPngBlob(
          {
            qrDataUrl,
            visitorName: "Naomi Lopez",
            code: "EJEMPLO179413181110277",
            validityLabel: "Frecuente (no expira)",
            validUntilLabel: "Sin vencimiento",
            residentialName: "Residencial Paseo Real",
            residentName: "Cristian Lopez",
            hasVehicle: true,
            hasExpiration: false,
          },
          {
            residential: t("qr.pdfResidential"),
            announcedBy: t("qr.announcedBy"),
            expires: t("qr.pdfExpires"),
            accessType: t("home.accessVehicle"),
            rulesTitle: t("qr.rulesTitle"),
            rule1: t("qr.ruleShowId"),
            rule2: t("qr.rulePedestrian"),
            rule3: t("qr.ruleSpeed"),
            experience: t("qr.experience"),
            nexusContact: t("qr.nexusContact"),
          },
        );
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "No se pudo generar el ejemplo.");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-200 px-4 py-6">
      <div className="mx-auto max-w-md text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
          Ejemplo local — no es un pase real
        </p>
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Pase de visita actual (GitHub + indicaciones)</h1>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!src && !error ? <p className="text-sm text-slate-600">Generando ejemplo...</p> : null}
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Ejemplo de pase de visita MiVisita" className="w-full rounded-xl bg-white shadow-2xl" />
        ) : null}
      </div>
    </div>
  );
}
