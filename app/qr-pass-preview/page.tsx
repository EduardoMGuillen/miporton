import type { Metadata } from "next";
import { QrPassPreviewClient } from "@/app/qr-pass-preview/qr-pass-preview-client";

export const metadata: Metadata = {
  title: "Ejemplo de pase MiVisita",
  robots: { index: false, follow: false },
};

/** Ejemplo visual del PNG que se comparte/descarga al crear un QR de visita. */
export default function QrPassPreviewPage() {
  return <QrPassPreviewClient />;
}
