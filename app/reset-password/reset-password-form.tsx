"use client";

import { useActionState } from "react";
import Link from "next/link";
import { PasswordField } from "@/app/components/password-field";
import { resetPasswordAction } from "@/app/password-reset/actions";

const initialState: string | null = null;

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  if (!token) {
    return (
      <p className="text-sm text-red-600">
        Falta el enlace de recuperación. Solicita uno nuevo desde{" "}
        <Link href="/forgot-password" className="font-medium underline">
          Olvidé mi contraseña
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <PasswordField
          id="password"
          name="password"
          required
          placeholder="Mínimo 6 caracteres"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
          Confirmar contraseña
        </label>
        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          required
          placeholder="Repite la contraseña"
          autoComplete="new-password"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button type="submit" disabled={isPending} className="btn-primary w-full disabled:opacity-50">
        {isPending ? "Guardando..." : "Guardar nueva contraseña"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-blue-700 hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </form>
  );
}
