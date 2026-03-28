"use client";

import { useState } from "react";
import { generateServiceContractPdf } from "@/app/super-admin/service-contract-pdf";

export function ServiceContractPrintButton({
  contractId,
  residentialName,
  legalRepresentative,
  representativeEmail,
  representativePhone,
  servicePlan,
  monthlyAmount,
  startsOn,
  endsOn,
  terms,
}: {
  contractId: string;
  residentialName: string;
  legalRepresentative: string;
  representativeEmail: string;
  representativePhone: string;
  servicePlan: string;
  monthlyAmount: number;
  startsOn: string;
  endsOn: string | null;
  terms: string | null;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      await generateServiceContractPdf({
        contractId,
        residentialName,
        legalRepresentative,
        representativeEmail,
        representativePhone,
        servicePlan,
        monthlyAmount,
        startsOn: new Date(startsOn),
        endsOn: endsOn ? new Date(endsOn) : null,
        terms,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isGenerating}
      onClick={() => {
        void handleGenerate();
      }}
      className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
    >
      {isGenerating ? "Generando PDF..." : "Imprimir contrato (PDF)"}
    </button>
  );
}
