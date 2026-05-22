"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

const NEXUS_ISSUER = {
  legalName: "Nexus Global",
  id: "0501200002818",
  address: "San Pedro Sula, Honduras",
  email: "eduardoguillendev@proton.me",
  phone: "31496601",
};

type ResidentialOption = { id: string; name: string };

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
  if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
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
    if (!context) return toDataUrl(blob);
    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function money(amount: number) {
  return amount.toLocaleString("es-HN", { style: "currency", currency: "HNL" });
}

function formatPaymentMonth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const [, yearRaw, monthRaw] = match;
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  return date.toLocaleDateString("es-HN", { month: "long", year: "numeric", timeZone: "UTC" });
}

function formatDueDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es-HN", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function safeFilePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

function drawLabelValue(doc: jsPDF, label: string, value: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(label, x, y);
  doc.setFont("helvetica", "normal");
  doc.text(value, x + 118, y);
  return y + 16;
}

export function InvoiceGenerator({ residentials }: { residentials: ResidentialOption[] }) {
  const [residentialId, setResidentialId] = useState("");
  const [paymentMonth, setPaymentMonth] = useState(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
  });
  const [amount, setAmount] = useState("");
  const [serviceDescription, setServiceDescription] = useState(
    "Suscripcion mensual MiVisita - Seguridad Residencial",
  );
  const [dueDate, setDueDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("Cuenta de cheques");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState(
    "Favor enviar comprobante de transferencia al correo de contacto indicado.",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedResidential = useMemo(
    () => residentials.find((item) => item.id === residentialId) ?? null,
    [residentialId, residentials],
  );

  async function generatePdf(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const numericAmount = Number(amount);
    if (!selectedResidential) {
      setMessage("Selecciona la residencial a facturar.");
      return;
    }
    if (!paymentMonth) {
      setMessage("Selecciona el mes del pago.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setMessage("El monto debe ser un numero mayor que 0.");
      return;
    }
    if (!bankName.trim() || !accountHolderName.trim() || !accountNumber.trim()) {
      setMessage("Completa banco, nombre de cuenta y numero de cuenta.");
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
      const invoiceNumber = `FAC-${Date.now()}`;
      const issuedAtLabel = formatDateTimeTegucigalpa(new Date());
      const periodLabel = formatPaymentMonth(paymentMonth);
      const dueDateLabel = formatDueDate(dueDate);

      if (nexusLogo) doc.addImage(nexusLogo, "PNG", 40, 28, 210, 58);
      if (miVisitaLogo) doc.addImage(miVisitaLogo, "JPEG", 500, 24, 58, 58);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("FACTURA", 40, 108);
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`No. de factura: ${invoiceNumber}`, 40, 128);
      doc.text(`Fecha de emision: ${issuedAtLabel}`, 40, 144);
      doc.text(`Periodo de servicio: ${periodLabel}`, 40, 160);
      doc.text(`Fecha limite de pago: ${dueDateLabel}`, 40, 176);

      let y = 208;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Datos del emisor", 40, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y = drawLabelValue(doc, "Razon social:", NEXUS_ISSUER.legalName, 40, y);
      y = drawLabelValue(doc, "ID:", NEXUS_ISSUER.id, 40, y);
      y = drawLabelValue(doc, "Direccion:", NEXUS_ISSUER.address, 40, y);
      y = drawLabelValue(doc, "Correo:", NEXUS_ISSUER.email, 40, y);
      y = drawLabelValue(doc, "Telefono:", NEXUS_ISSUER.phone, 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Datos del cliente", 40, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y = drawLabelValue(doc, "Residencial:", selectedResidential.name, 40, y);

      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Detalle de cobro", 40, y);
      y += 20;

      doc.setDrawColor(30, 64, 175);
      doc.setFillColor(239, 246, 255);
      doc.rect(40, y - 14, 515, 22, "F");
      doc.setTextColor(30, 64, 175);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Concepto", 48, y);
      doc.text("Periodo", 300, y);
      doc.text("Monto", 500, y, { align: "right" });
      y += 24;

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      const conceptLines = doc.splitTextToSize(serviceDescription.trim(), 230);
      doc.text(conceptLines, 48, y);
      doc.text(periodLabel, 300, y);
      doc.text(money(numericAmount), 555, y, { align: "right" });
      y += Math.max(18, conceptLines.length * 13);

      doc.setDrawColor(210, 214, 220);
      doc.line(40, y + 4, 555, y + 4);
      y += 24;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Total a pagar:", 380, y);
      doc.text(money(numericAmount), 555, y, { align: "right" });

      y += 28;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Instrucciones de pago", 40, y);
      y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      y = drawLabelValue(doc, "Banco:", bankName.trim(), 40, y);
      y = drawLabelValue(doc, "Nombre cuenta:", accountHolderName.trim(), 40, y);
      y = drawLabelValue(doc, "No. cuenta:", accountNumber.trim(), 40, y);
      y = drawLabelValue(doc, "Tipo cuenta:", accountType.trim(), 40, y);
      if (paymentReference.trim()) {
        y = drawLabelValue(doc, "Referencia:", paymentReference.trim(), 40, y);
      }

      if (notes.trim()) {
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Notas", 40, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(notes.trim(), 515);
        doc.text(noteLines, 40, y);
        y += noteLines.length * 12;
      }

      doc.setDrawColor(210, 214, 220);
      doc.line(40, Math.min(y + 16, 760), 555, Math.min(y + 16, 760));
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(
        "Documento generado por MiVisita. Esta factura es un comprobante de cobro emitido por Nexus Global.",
        40,
        Math.min(y + 34, 780),
      );

      const fileSlug = safeFilePart(selectedResidential.name) || "residencial";
      const monthSlug = paymentMonth.replace("-", "");
      doc.save(`factura-${fileSlug}-${monthSlug}.pdf`);
      setMessage("Factura PDF generada correctamente.");
    } catch {
      setMessage("No se pudo generar el PDF de la factura.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <form onSubmit={generatePdf} className="grid gap-3 md:grid-cols-2">
      <select
        className="field-base md:col-span-2"
        value={residentialId}
        onChange={(event) => setResidentialId(event.target.value)}
        required
      >
        <option value="">Seleccionar residencial</option>
        {residentials.map((residential) => (
          <option key={residential.id} value={residential.id}>
            {residential.name}
          </option>
        ))}
      </select>

      <input
        className="field-base"
        type="month"
        value={paymentMonth}
        onChange={(event) => setPaymentMonth(event.target.value)}
        required
      />
      <input
        className="field-base"
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        title="Fecha limite de pago"
      />
      <input
        className="field-base"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Monto a facturar (HNL)"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        required
      />
      <input
        className="field-base md:col-span-2"
        placeholder="Concepto / descripcion del servicio"
        value={serviceDescription}
        onChange={(event) => setServiceDescription(event.target.value)}
        required
      />

      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
        Datos bancarios para pago
      </p>
      <input
        className="field-base"
        placeholder="Banco"
        value={bankName}
        onChange={(event) => setBankName(event.target.value)}
        required
      />
      <input
        className="field-base"
        placeholder="Nombre de la cuenta"
        value={accountHolderName}
        onChange={(event) => setAccountHolderName(event.target.value)}
        required
      />
      <input
        className="field-base"
        placeholder="Numero de cuenta"
        value={accountNumber}
        onChange={(event) => setAccountNumber(event.target.value)}
        required
      />
      <select
        className="field-base"
        value={accountType}
        onChange={(event) => setAccountType(event.target.value)}
      >
        <option value="Cuenta de cheques">Cuenta de cheques</option>
        <option value="Cuenta de ahorro">Cuenta de ahorro</option>
      </select>
      <input
        className="field-base md:col-span-2"
        placeholder="Referencia de pago (opcional, ej. nombre residencial)"
        value={paymentReference}
        onChange={(event) => setPaymentReference(event.target.value)}
      />
      <textarea
        className="field-base md:col-span-2"
        rows={2}
        placeholder="Notas al pie de factura"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <button type="submit" disabled={isGenerating} className="btn-primary disabled:opacity-60 md:w-max">
        {isGenerating ? "Generando PDF..." : "Generar factura PDF"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
