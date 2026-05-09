"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "@/app/login/actions";
import { PasswordField } from "@/app/components/password-field";

const initialState: string | null = null;

type LoginFormProps = {
  resetSuccess?: boolean;
};

export function LoginForm({ resetSuccess = false }: LoginFormProps) {
  const [error, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {resetSuccess ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
      ) : null}
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
          placeholder="El usuario de tu cuenta"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <PasswordField id="password" name="password" required placeholder="******" autoComplete="current-password" />
        <p className="mt-1 text-right text-sm">
          <Link href="/forgot-password" className="font-medium text-blue-700 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full disabled:opacity-50"
      >
        {isPending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
