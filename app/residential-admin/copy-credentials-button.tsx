"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  buildResidentialUserCredentialsCopyMessageAction,
  type CopyResidentialCredentialsResult,
} from "@/app/residential-admin/actions";

const initial: CopyResidentialCredentialsResult = null;

export function CopyResidentialCredentialsButton({ userId }: { userId: string }) {
  const [result, formAction, isPending] = useActionState(
    buildResidentialUserCredentialsCopyMessageAction,
    initial,
  );
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const lastCopiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPending) {
      lastCopiedRef.current = null;
    }
  }, [isPending]);

  useEffect(() => {
    if (!result?.ok) return;
    if (lastCopiedRef.current === result.text) return;
    lastCopiedRef.current = result.text;
    void (async () => {
      try {
        await navigator.clipboard.writeText(result.text);
        setLocalMessage("Copiado al portapapeles.");
      } catch {
        setLocalMessage("No se pudo copiar automáticamente. Permite el portapapeles o copia el texto a mano.");
      }
      window.setTimeout(() => setLocalMessage(null), 5000);
    })();
  }, [result]);

  return (
    <div className="flex min-w-[200px] flex-col gap-1">
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
        >
          {isPending ? "Generando..." : "Copiar mensaje credenciales"}
        </button>
      </form>
      {result && !result.ok ? <p className="text-xs text-red-600">{result.message}</p> : null}
      {localMessage ? <p className="text-xs font-medium text-emerald-700">{localMessage}</p> : null}
    </div>
  );
}
