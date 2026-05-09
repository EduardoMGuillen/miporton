"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "@/app/components/confirm-submit-button";
import {
  generateResidentialOneTimePasswordAction,
  revealResidentialOneTimePasswordAction,
  resetResidentialOneTimePasswordToDefaultAction,
} from "@/app/residential-admin/actions";

const initialState: string | null = null;

type Props = {
  userId: string;
  hasPersonalOtp: boolean;
  otpCreatedAt: Date | null;
};

export function ResidentialOneTimePasswordControls({ userId, hasPersonalOtp, otpCreatedAt }: Props) {
  const [showMessage, showAction, isShowing] = useActionState(revealResidentialOneTimePasswordAction, initialState);
  const [rotateMessage, rotateAction, isRotating] = useActionState(
    generateResidentialOneTimePasswordAction,
    initialState,
  );

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold text-slate-700">Contrasena de 1 uso (OTP)</p>
      <p className="text-xs text-slate-500">
        Estado: {hasPersonalOtp ? "Personal rotativa" : "Default global (sesion1+2026)"}
      </p>
      {otpCreatedAt ? (
        <p className="text-xs text-slate-500">Rotada por ultima vez: {otpCreatedAt.toLocaleString("es-HN")}</p>
      ) : null}

      <div className="mt-2 flex flex-wrap gap-2">
        <form action={showAction}>
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            disabled={isShowing}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
          >
            {isShowing ? "Mostrando..." : "Ver OTP"}
          </button>
        </form>

        <form action={rotateAction}>
          <input type="hidden" name="userId" value={userId} />
          <ConfirmSubmitButton
            confirmMessage="Se generara una OTP personal nueva para este residente."
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            {isRotating ? "Generando..." : "Renovar OTP"}
          </ConfirmSubmitButton>
        </form>

        {hasPersonalOtp ? (
          <form action={resetResidentialOneTimePasswordToDefaultAction}>
            <input type="hidden" name="userId" value={userId} />
            <ConfirmSubmitButton
              confirmMessage="Se eliminara la OTP personal y volvera a la default global."
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              Volver al default
            </ConfirmSubmitButton>
          </form>
        ) : null}
      </div>

      {showMessage ? <p className="mt-2 text-xs font-semibold text-slate-800">{showMessage}</p> : null}
      {rotateMessage ? <p className="mt-1 text-xs font-semibold text-slate-800">{rotateMessage}</p> : null}
      <p className="mt-2 text-[11px] text-slate-500">
        La contraseña normal del residente no cambia. Si entra con OTP, el sistema rota a una nueva OTP automáticamente.
      </p>
    </div>
  );
}