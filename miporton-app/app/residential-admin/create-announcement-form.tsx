"use client";

import { useActionState, useState } from "react";
import { sendResidentialAnnouncementAction } from "@/app/residential-admin/actions";

const initialState: string | null = null;

export function CreateAnnouncementForm({
  residents,
}: {
  residents: Array<{ id: string; fullName: string }>;
}) {
  const [targetMode, setTargetMode] = useState<"ALL_RESIDENTS" | "SELECTED_RESIDENTS" | "OWNERS_ONLY">(
    "ALL_RESIDENTS",
  );
  const [message, formAction, isPending] = useActionState(sendResidentialAnnouncementAction, initialState);

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input name="title" required className="field-base md:col-span-2" placeholder="Titulo del comunicado" />
      <textarea
        name="message"
        required
        maxLength={500}
        rows={4}
        className="field-base md:col-span-2"
        placeholder="Mensaje del comunicado"
      />
      <select
        name="targetMode"
        value={targetMode}
        onChange={(event) =>
          setTargetMode(event.target.value as "ALL_RESIDENTS" | "SELECTED_RESIDENTS" | "OWNERS_ONLY")
        }
        className="field-base md:col-span-2"
      >
        <option value="ALL_RESIDENTS">Enviar a todos los residentes</option>
        <option value="OWNERS_ONLY">Enviar solo a dueños</option>
        <option value="SELECTED_RESIDENTS">Enviar a residentes seleccionados</option>
      </select>

      {targetMode === "SELECTED_RESIDENTS" ? (
        <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Seleccion de destinatarios
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {residents.map((resident) => (
              <label key={resident.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="residentIds" value={resident.id} />
                <span>{resident.fullName}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-60 md:w-max">
        {isPending ? "Enviando..." : "Enviar comunicado"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
