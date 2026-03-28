import { Card } from "@/app/components/shell";
import { QuotationGenerator } from "@/app/super-admin/quotation-generator";
import { ServiceContractForm } from "@/app/super-admin/service-contract-form";
import { ServiceContractPrintButton } from "@/app/super-admin/service-contract-print-button";
import { requireRole } from "@/lib/authorization";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

export default async function SuperAdminContractsPage() {
  await requireRole(["SUPER_ADMIN"]);

  const [residentials, recentContracts] = await Promise.all([
    prisma.residential.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceContract.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Crear cotizacion</h2>
        <p className="mb-4 text-sm text-slate-600">
          Genera una cotizacion PDF a nombre de Nexus Global para el servicio MiVisita - Seguridad
          Residencial.
        </p>
        <QuotationGenerator />
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Contrato de servicio (super admin)</h2>
        <p className="mb-4 text-sm text-slate-600">
          Crea contrato para conjunto residencial y genera su PDF.
        </p>
        <ServiceContractForm residentials={residentials} />
        <div className="mt-4 grid gap-2">
          {recentContracts.map((contract) => (
            <div key={contract.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <p className="text-sm font-semibold text-slate-900">{contract.residentialName}</p>
              <p className="text-xs text-slate-600">
                Representante: {contract.legalRepresentative} | Plan: {contract.servicePlan}
              </p>
              <p className="text-xs text-slate-500">
                Inicio: {formatDateTimeTegucigalpa(contract.startsOn)} | Monto mensual: HNL{" "}
                {contract.monthlyAmount.toLocaleString("es-HN", { minimumFractionDigits: 2 })}
              </p>
              <ServiceContractPrintButton
                contractId={contract.id}
                residentialName={contract.residentialName}
                legalRepresentative={contract.legalRepresentative}
                representativeEmail={contract.representativeEmail}
                representativePhone={contract.representativePhone}
                servicePlan={contract.servicePlan}
                monthlyAmount={contract.monthlyAmount}
                startsOn={contract.startsOn.toISOString()}
                endsOn={contract.endsOn ? contract.endsOn.toISOString() : null}
                terms={contract.terms}
              />
            </div>
          ))}
          {recentContracts.length === 0 ? (
            <p className="text-sm text-slate-600">Aun no hay contratos registrados.</p>
          ) : null}
        </div>
      </Card>
    </>
  );
}
