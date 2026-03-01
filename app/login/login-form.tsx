"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/login/actions";

const initialState: string | null = null;

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="field-base"
          placeholder="usuario@correo.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="field-base"
          placeholder="******"
        />
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
