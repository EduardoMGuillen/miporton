import { requireRole } from "@/lib/authorization";
import { Card } from "@/app/components/shell";
import { ResidentSuggestionForm } from "@/app/resident/suggestion-form";
import { getResidentLocale } from "@/lib/get-resident-locale";
import { residentT } from "@/app/resident/resident-dictionary";

export default async function ResidentSuggestionsPage() {
  const locale = await getResidentLocale();
  const t = (key: string) => residentT(locale, key);
  await requireRole(["RESIDENT"]);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{t("suggestions.heading")}</h2>
      <p className="mb-4 text-sm text-slate-600">{t("suggestions.intro")}</p>
      <ResidentSuggestionForm />
    </Card>
  );
}
