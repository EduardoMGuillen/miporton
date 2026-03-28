import { Card } from "@/app/components/shell";
import { requireRole } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { formatDateTimeTegucigalpa } from "@/lib/datetime";

export default async function ResidentialAdminSuggestionsPage() {
  const session = await requireRole(["RESIDENTIAL_ADMIN"]);
  if (!session.residentialId) {
    return <p className="p-8 text-red-600">Sesion invalida: no hay residencial asociada.</p>;
  }

  const suggestions = await prisma.residentSuggestion.findMany({
    where: {
      residentialId: session.residentialId,
    },
    include: {
      resident: {
        select: { fullName: true, houseNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Sugerencias de residentes</h2>
      <div className="grid gap-3">
        {suggestions.map((suggestion) => (
          <article key={suggestion.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-900">{suggestion.resident.fullName}</p>
            <p className="text-xs text-slate-600">
              Vivienda: {suggestion.resident.houseNumber || "Sin definir"} | Fecha:{" "}
              {formatDateTimeTegucigalpa(suggestion.createdAt)}
            </p>
            <p className="mt-2 text-sm text-slate-700">{suggestion.message}</p>
          </article>
        ))}
        {suggestions.length === 0 ? (
          <p className="text-sm text-slate-600">Aun no hay sugerencias de residentes.</p>
        ) : null}
      </div>
    </Card>
  );
}
