"use client";

import { useState } from "react";
import { useActionState } from "react";
import { createResidentialUserAction } from "@/app/residential-admin/actions";

const initialState: string | null = null;

export function CreateResidentialUserForm() {
  const [message, formAction, isPending] = useActionState(createResidentialUserAction, initialState);
  const [role, setRole] = useState<"RESIDENT" | "GUARD">("RESIDENT");
  const [residentCategory, setResidentCategory] = useState<"OWNER" | "TENANT">("OWNER");

  return (
    <form action={formAction} className="grid gap-3 md:grid-cols-2">
      <input
        name="fullName"
        placeholder="Nombre completo"
        required
        className="field-base"
      />
      <input
        name="email"
        type="email"
        placeholder="Correo"
        required
        className="field-base"
      />
      <input
        name="password"
        type="password"
        placeholder="Password inicial"
        required
        className="field-base"
      />
      <select
        name="role"
        value={role}
        onChange={(event) => setRole(event.target.value as "RESIDENT" | "GUARD")}
        className="field-base"
      >
        <option value="RESIDENT">Residente</option>
        <option value="GUARD">Guardia</option>
      </select>
      {role === "RESIDENT" ? (
        <>
          <select
            name="residentCategory"
            value={residentCategory}
            onChange={(event) => setResidentCategory(event.target.value as "OWNER" | "TENANT")}
            className="field-base"
          >
            <option value="OWNER">Dueño</option>
            <option value="TENANT">Inquilino</option>
          </select>
          <input
            name="houseNumber"
            placeholder="Numero de vivienda (opcional)"
            className="field-base"
          />
        </>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary disabled:opacity-60 md:col-span-2 md:w-max"
      >
        {isPending ? "Creando..." : "Crear usuario"}
      </button>
      {message ? <p className="text-sm text-slate-700 md:col-span-2">{message}</p> : null}
    </form>
  );
}
