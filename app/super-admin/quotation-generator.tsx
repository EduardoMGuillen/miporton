"use client";

import { useState } from "react";
import { jsPDF } from "jspdf";

type PaymentType = "MENSUAL" | "SEMESTRAL" | "ANUAL";

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer el logo."));
    reader.readAsDataURL(blob);
  });
}

function loadImageFromObjectUrl(objectUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo cargar la imagen del logo."));
    image.src = objectUrl;
  });
}

async function optimizeImageToJpegDataUrl(
  path: string,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number },
) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`No se pudo cargar ${path}`);
  }
  const blob = await response.blob();

  const maxWidth = options?.maxWidth ?? 320;
  const maxHeight = options?.maxHeight ?? 320;
  const quality = options?.quality ?? 0.68;
  const sourceUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImageFromObjectUrl(sourceUrl);
    const widthRatio = maxWidth / image.width;
    const heightRatio = maxHeight / image.height;
    const ratio = Math.min(widthRatio, heightRatio, 1);

    const targetWidth = Math.max(1, Math.round(image.width * ratio));
    const targetHeight = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return toDataUrl(blob);
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    // Convert to JPEG with compression to keep quotation PDF light.
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function money(amount: number) {
  return amount.toLocaleString("es-HN", { style: "currency", currency: "HNL" });
}

export function QuotationGenerator() {
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("MENSUAL");
  const [amount, setAmount] = useState("");
  const [nexusRepName, setNexusRepName] = useState("");
  const [nexusRepPhone, setNexusRepPhone] = useState("");
  const [nexusRepEmail, setNexusRepEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generatePdf(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("El monto debe ser un numero mayor que 0.");
      return;
    }

    setIsGenerating(true);
    try {
      const [nexusLogo, miVisitaLogo] = await Promise.all([
        toDataUrl(await (await fetch("/nexustexto.png")).blob()).catch(() => null),
        optimizeImageToJpegDataUrl("/logomivisita.png", {
          maxWidth: 240,
          maxHeight: 240,
          quality: 0.68,
        }).catch(() => null),
      ]);

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const quoteNumber = `COT-${Date.now()}`;
      const createdAtLabel = new Date().toLocaleString("es-DO");

      if (nexusLogo) {
        doc.addImage(nexusLogo, "PNG", 40, 30, 210, 60);
      }
      if (miVisitaLogo) {
        doc.addImage(miVisitaLogo, "JPEG", 500, 25, 60, 60);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("COTIZACION DE SERVICIO", 40, 120);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Empresa emisora: Nexus Global", 40, 142);
      doc.text("Servicio: MiVisita - Seguridad Residencial", 40, 160);
      doc.text(`No. de cotizacion: ${quoteNumber}`, 40, 178);
      doc.text(`Fecha: ${createdAtLabel}`, 40, 196);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Datos del cliente", 40, 232);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Nombre: ${clientName}`, 40, 252);
      doc.text(`Telefono: ${clientPhone}`, 40, 270);
      doc.text(`Empresa: ${clientCompany}`, 40, 288);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Condiciones comerciales", 40, 326);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Tipo de pago: ${paymentType}`, 40, 346);
      doc.text(`Monto a pagar: ${money(numericAmount)}`, 40, 364);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Representante Nexus Global", 40, 402);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Nombre: ${nexusRepName}`, 40, 422);
      doc.text(`Telefono: ${nexusRepPhone}`, 40, 440);
      doc.text(`Correo: ${nexusRepEmail}`, 40, 458);

      doc.setDrawColor(210, 214, 220);
      doc.line(40, 495, 560, 495);
      doc.setFontSize(10);
      doc.text(
        "Esta cotizacion fue generada por MiVisita para fines comerciales de Nexus Global.",
        40,
        515,
      );

      const safeCompany = clientCompany.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
      doc.save(`cotizacion-${safeCompany || "cliente"}-${Date.now()}.pdf`);
      setMessage("PDF generado correctamente.");
    } catch {
      setMessage("No se pudo generar el PDF de la cotizacion.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form onSubmit={generatePdf} className="grid gap-3 md:grid-cols-2">
      <input
        className="field-base"
        placeholder="Nombre del cliente"
        value={clientName}
        onChange={(event) => setClientName(event.target.value)}
        required
      />
      <input
        className="field-base"
        placeholder="Telefono del cliente"
        value={clientPhone}
        onChange={(event) => setClientPhone(event.target.value)}
        required
      />
      <input
        className="field-base md:col-span-2"
        placeholder="Empresa del cliente"
        value={clientCompany}
        onChange={(event) => setClientCompany(event.target.value)}
        required
      />
      <select
        className="field-base"
        value={paymentType}
        onChange={(event) => setPaymentType(event.target.value as PaymentType)}
      >
        <option value="MENSUAL">Pago mensual</option>
        <option value="SEMESTRAL">Pago semestral</option>
        <option value="ANUAL">Pago anual</option>
      </select>
      <input
        className="field-base"
        type="number"
        min="1"
        step="0.01"
        placeholder="Monto a pagar"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
      />

      <input
        className="field-base"
        placeholder="Nombre representante Nexus"
        value={nexusRepName}
        onChange={(event) => setNexusRepName(event.target.value)}
        required
      />
      <input
        className="field-base"
        placeholder="Telefono representante Nexus"
        value={nexusRepPhone}
        onChange={(event) => setNexusRepPhone(event.target.value)}
        required
      />
      <input
        className="field-base md:col-span-2"
        type="email"
        placeholder="Correo representante Nexus"
        value={nexusRepEmail}
        onChange={(event) => setNexusRepEmail(event.target.value)}
        required
      />

      <button type="submit" disabled={isGenerating} className="btn-primary disabled:opacity-60 md:w-max">
        {isGenerating ? "Generando PDF..." : "Generar cotizacion PDF"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
