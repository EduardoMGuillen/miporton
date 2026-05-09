"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordResetAction, type PasswordResetRequestState } from "@/app/password-reset/actions";

const initialState: PasswordResetRequestState = null;

type ForgotPasswordFormProps = {
  supportWhatsappUrl: string | null;
};

export function ForgotPasswordForm({ supportWhatsappUrl }: ForgotPasswordFormProps) {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Usuario
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="field-base"
          placeholder="El mismo que usas para iniciar sesión"
        />
        <p className="mt-1 text-xs text-slate-500">
          Si tu cuenta tiene correo de contacto guardado, te enviaremos el enlace alli.
        </p>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary w-full disabled:opacity-50">
        {isPending ? "Enviando..." : "Enviar enlace"}
      </button>
      {state?.kind === "generic" ? <p className="text-sm text-slate-700">{state.message}</p> : null}
      {state?.kind === "no_contact" ? (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          <p>{state.message}</p>
          {supportWhatsappUrl ? (
            <a
              href={supportWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Contactar soporte por WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
