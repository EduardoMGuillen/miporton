"use client";

import { useActionState } from "react";
import { createResidentSuggestionAction } from "@/app/resident/actions";

const initialState: string | null = null;

export function ResidentSuggestionForm() {
  const [message, formAction, isPending] = useActionState(createResidentSuggestionAction, initialState);

  return (
    <form action={formAction} className="grid gap-3">
      <textarea
        name="message"
        required
        maxLength={500}
        rows={4}
        className="field-base"
        placeholder="Escribe tu sugerencia para la administracion..."
      />
      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Enviando..." : "Enviar sugerencia"}
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
