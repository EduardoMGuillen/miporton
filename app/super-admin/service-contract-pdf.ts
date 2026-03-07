"use client";

import { jsPDF } from "jspdf";

export type ServiceContractPdfInput = {
  contractId?: string;
  generatedAt?: Date;
  residentialName: string;
  legalRepresentative: string;
  representativeEmail: string;
  representativePhone: string;
  servicePlan: string;
  monthlyAmount: number;
  startsOn: Date;
  endsOn?: Date | null;
  terms?: string | null;
};

type LogoBundle = {
  nexusLogo: string | null;
  miVisitaLogo: string | null;
};

function formatHnl(amount: number) {
  return amount.toLocaleString("es-HN", {
    style: "currency",
    currency: "HNL",
    minimumFractionDigits: 2,
  });
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("es-HN", {
    timeZone: "America/Tegucigalpa",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

async function fileToDataUrl(blob: Blob) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(blob);
  });
}

async function loadLogos(): Promise<LogoBundle> {
  const [nexusLogo, miVisitaLogo] = await Promise.all([
    fetch("/nexustexto.png")
      .then(async (response) => (response.ok ? await fileToDataUrl(await response.blob()) : null))
      .catch(() => null),
    fetch("/logomivisita.png")
      .then(async (response) => (response.ok ? await fileToDataUrl(await response.blob()) : null))
      .catch(() => null),
  ]);
  return { nexusLogo, miVisitaLogo };
}

function drawWrappedParagraph(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 13,
) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensureSpace(doc: jsPDF, y: number, minSpace: number) {
  if (y + minSpace <= 800) return y;
  doc.addPage();
  return 46;
}

export async function generateServiceContractPdf(input: ServiceContractPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const logos = await loadLogos();
  const generatedAt = input.generatedAt ?? new Date();
  const contractRef = input.contractId ? `CONT-${input.contractId.slice(-8).toUpperCase()}` : `CONT-${Date.now()}`;

  let y = 42;
  if (logos.nexusLogo) {
    doc.addImage(logos.nexusLogo, "PNG", 40, 24, 210, 56);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Nexus Global", 40, 52);
  }
  if (logos.miVisitaLogo) {
    doc.addImage(logos.miVisitaLogo, "PNG", 500, 22, 54, 54);
  }

  y = 96;
  doc.setDrawColor(210, 214, 220);
  doc.line(40, y, 555, y);
  y += 24;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CONTRATO DE PRESTACION DE SERVICIOS TECNOLOGICOS", 40, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Referencia: ${contractRef}`, 40, y);
  doc.text(`Fecha de emision: ${formatDateLabel(generatedAt)}`, 365, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y = drawWrappedParagraph(
    doc,
    `Entre Nexus Global y ${input.residentialName}, representada por ${input.legalRepresentative}, se acuerda la prestacion del servicio ${input.servicePlan} bajo las clausulas descritas en este documento.`,
    40,
    y,
    515,
  );
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Datos del cliente", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const customerRows = [
    `Residencial/cliente: ${input.residentialName}`,
    `Representante legal: ${input.legalRepresentative}`,
    `Correo de contacto: ${input.representativeEmail}`,
    `Telefono de contacto: ${input.representativePhone}`,
  ];
  customerRows.forEach((line) => {
    doc.text(line, 48, y);
    y += 13;
  });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Condiciones economicas y vigencia", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const commercialRows = [
    `Plan contratado: ${input.servicePlan}`,
    `Monto mensual: ${formatHnl(input.monthlyAmount)}`,
    `Fecha de inicio: ${formatDateLabel(input.startsOn)}`,
    `Fecha de finalizacion: ${input.endsOn ? formatDateLabel(input.endsOn) : "Indefinida (hasta cancelacion escrita)"}`,
  ];
  commercialRows.forEach((line) => {
    doc.text(line, 48, y);
    y += 13;
  });
  y += 8;

  y = ensureSpace(doc, y, 210);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Terminos de uso y operacion", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const standardTerms = [
    "El servicio MiVisita se provee para control de acceso y gestion de visitas en la residencial contratante.",
    "Nexus Global brindara soporte tecnico en horario laboral y atencion de incidentes criticos conforme al plan contratado.",
    "La residencial se compromete a usar la plataforma de forma licita, proteger sus credenciales y reportar accesos no autorizados.",
    "El incumplimiento de pagos por mas de 30 dias habilita suspension temporal del servicio hasta regularizacion.",
    "Cualquier modificacion relevante del servicio se notificara por escrito con antelacion razonable.",
  ];
  standardTerms.forEach((term, index) => {
    y = drawWrappedParagraph(doc, `${index + 1}. ${term}`, 48, y, 507, 13) + 3;
  });

  y += 6;
  y = ensureSpace(doc, y, 170);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Privacidad y tratamiento de datos", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const privacyParagraph =
    "Las evidencias de acceso (fotografia de identificacion y placa cuando aplique) son tratadas para fines de seguridad y control operativo. La plataforma conserva datos conforme a la configuracion vigente y la normativa aplicable. La residencial contratante es responsable de informar a sus usuarios sobre este tratamiento y de gestionar solicitudes internas de acceso, rectificacion y eliminacion de datos.";
  y = drawWrappedParagraph(doc, privacyParagraph, 48, y, 507, 13) + 8;

  if (input.terms && input.terms.trim()) {
    y = ensureSpace(doc, y, 120);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("5. Clausulas adicionales acordadas", 40, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = drawWrappedParagraph(doc, input.terms.trim(), 48, y, 507, 13) + 8;
  }

  y = ensureSpace(doc, y, 120);
  doc.setDrawColor(210, 214, 220);
  doc.line(40, y, 555, y);
  y += 28;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Firma representante Nexus Global", 60, y + 32);
  doc.text("Firma representante residencial", 330, y + 32);
  doc.line(50, y + 20, 250, y + 20);
  doc.line(320, y + 20, 520, y + 20);

  doc.setFontSize(8.5);
  doc.setTextColor(90, 102, 121);
  doc.text(
    "Documento generado por MiVisita. Este contrato puede complementarse con anexos comerciales o tecnicos.",
    40,
    820,
  );

  const safeName = input.residentialName.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
  doc.save(`contrato-servicio-${safeName || "residencial"}-${contractRef}.pdf`);
}
