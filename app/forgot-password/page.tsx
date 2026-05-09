import Image from "next/image";
import Link from "next/link";
import { ForgotPasswordForm } from "@/app/forgot-password/forgot-password-form";
import { getSupportWhatsappUrl } from "@/lib/email/resend-client";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const supportWhatsappUrl = getSupportWhatsappUrl();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-10">
      <article className="surface-card w-full p-6 md:p-8">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/login" className="shrink-0">
            <Image src="/logomivisitaresized.png" alt="MiVisita" width={44} height={44} className="rounded-lg" />
          </Link>
          <div>
            <p className="text-sm font-semibold text-slate-900">MiVisita</p>
            <p className="text-xs text-slate-500">Recuperar contrasena</p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Olvidaste tu contrasena</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ingresa tu usuario (el mismo de inicio de sesion). Te enviaremos el enlace al correo de contacto que
          tengas registrado en MiVisita.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm supportWhatsappUrl={supportWhatsappUrl} />
        </div>
      </article>
    </main>
  );
}
