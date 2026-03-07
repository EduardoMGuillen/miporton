"use client";

import { useActionState, useState } from "react";
import { jsPDF } from "jspdf";
import { createServiceContractAction } from "@/app/super-admin/actions";

const initialState: string | null = null;

export function ServiceContractForm({
  residentials,
}: {
  residentials: Array<{ id: string; name: string }>;
}) {
  const [message, formAction, isPending] = useActionState(createServiceContractAction, initialState);
  const [formValues, setFormValues] = useState({
    residentialName: "",
    legalRepresentative: "",
    representativeEmail: "",
    representativePhone: "",
    servicePlan: "Plan MiVisita",
    monthlyAmount: "",
    startsOn: "",
    endsOn: "",
    terms: "",
  });

  function generatePreviewPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    let y = 50;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Contrato de Servicio - MiVisita", 40, y);
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const amount = Number(formValues.monthlyAmount || 0);
    const lines = [
      `Residencial/Cliente: ${formValues.residentialName || "-"}`,
      `Representante legal: ${formValues.legalRepresentative || "-"}`,
      `Email: ${formValues.representativeEmail || "-"}`,
      `Telefono: ${formValues.representativePhone || "-"}`,
      `Plan: ${formValues.servicePlan || "-"}`,
      `Monto mensual: HNL ${amount.toLocaleString("es-HN", { minimumFractionDigits: 2 })}`,
      `Inicio: ${formValues.startsOn || "-"}`,
      `Fin: ${formValues.endsOn || "No definido"}`,
      "",
      "Terminos:",
      formValues.terms || "Sin terminos adicionales.",
    ];
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 520);
      doc.text(wrapped, 40, y);
      y += wrapped.length * 14;
    });
    doc.save(`contrato-servicio-${(formValues.residentialName || "cliente").replaceAll(" ", "-")}.pdf`);
  }

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <select
        name="residentialId"
        className="field-base"
        onChange={(event) => {
          const selected = residentials.find((r) => r.id === event.target.value);
          if (!selected) return;
          setFormValues((prev) => ({ ...prev, residentialName: selected.name }));
        }}
      >
        <option value="">Seleccionar residencial (opcional)</option>
        {residentials.map((residential) => (
          <option key={residential.id} value={residential.id}>
            {residential.name}
          </option>
        ))}
      </select>
      <input
        name="residentialName"
        required
        className="field-base"
        placeholder="Nombre de residencial/cliente"
        value={formValues.residentialName}
        onChange={(event) => setFormValues((prev) => ({ ...prev, residentialName: event.target.value }))}
      />
      <input
        name="legalRepresentative"
        required
        className="field-base"
        placeholder="Representante legal"
        value={formValues.legalRepresentative}
        onChange={(event) => setFormValues((prev) => ({ ...prev, legalRepresentative: event.target.value }))}
      />
      <input
        name="representativeEmail"
        required
        type="email"
        className="field-base"
        placeholder="Email representante"
        value={formValues.representativeEmail}
        onChange={(event) => setFormValues((prev) => ({ ...prev, representativeEmail: event.target.value }))}
      />
      <input
        name="representativePhone"
        required
        className="field-base"
        placeholder="Telefono representante"
        value={formValues.representativePhone}
        onChange={(event) => setFormValues((prev) => ({ ...prev, representativePhone: event.target.value }))}
      />
      <input
        name="servicePlan"
        required
        className="field-base"
        placeholder="Plan de servicio"
        value={formValues.servicePlan}
        onChange={(event) => setFormValues((prev) => ({ ...prev, servicePlan: event.target.value }))}
      />
      <input
        name="monthlyAmount"
        required
        type="number"
        step="0.01"
        className="field-base"
        placeholder="Monto mensual HNL"
        value={formValues.monthlyAmount}
        onChange={(event) => setFormValues((prev) => ({ ...prev, monthlyAmount: event.target.value }))}
      />
      <input
        name="startsOn"
        required
        type="date"
        className="field-base"
        value={formValues.startsOn}
        onChange={(event) => setFormValues((prev) => ({ ...prev, startsOn: event.target.value }))}
      />
      <input
        name="endsOn"
        type="date"
        className="field-base"
        value={formValues.endsOn}
        onChange={(event) => setFormValues((prev) => ({ ...prev, endsOn: event.target.value }))}
      />
      <textarea
        name="terms"
        className="field-base md:col-span-2"
        rows={4}
        maxLength={1500}
        placeholder="Terminos adicionales"
        value={formValues.terms}
        onChange={(event) => setFormValues((prev) => ({ ...prev, terms: event.target.value }))}
      />
      <div className="md:col-span-2 flex flex-wrap gap-2">
        <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60">
          {isPending ? "Guardando contrato..." : "Guardar contrato"}
        </button>
        <button
          type="button"
          onClick={generatePreviewPdf}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Generar PDF del contrato
        </button>
      </div>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
