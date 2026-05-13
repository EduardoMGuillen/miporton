import { requireRole } from "@/lib/authorization";
import { Card } from "@/app/components/shell";
import { ResidentSuggestionForm } from "@/app/resident/suggestion-form";

export default async function ResidentSuggestionsPage() {
  await requireRole(["RESIDENT"]);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Sugerencias para la administracion</h2>
      <p className="mb-4 text-sm text-slate-600">
        Tus mensajes llegan al equipo administrativo de tu residencial.
      </p>
      <ResidentSuggestionForm />
    </Card>
  );
}
