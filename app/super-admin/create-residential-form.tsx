"use client";

import { useActionState } from "react";
import { createResidentialWithAdminAction } from "@/app/super-admin/actions";
import { PasswordField } from "@/app/components/password-field";

const initialState: string | null = null;

export function CreateResidentialForm() {
  const [message, formAction, isPending] = useActionState(
    createResidentialWithAdminAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input
        name="residentialName"
        placeholder="Nombre de residencial"
        required
        className="field-base"
      />
      <input
        name="adminName"
        placeholder="Nombre del admin"
        required
        className="field-base"
      />
      <input
        name="adminEmail"
        type="email"
        placeholder="Correo del admin"
        required
        className="field-base"
      />
      <PasswordField
        name="adminPassword"
        placeholder="Password inicial"
        required
        autoComplete="new-password"
      />
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary disabled:opacity-60 md:col-span-2 md:w-max"
      >
        {isPending ? "Creando..." : "Crear residencial + admin"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
