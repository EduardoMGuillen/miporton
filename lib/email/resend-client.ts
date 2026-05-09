import { Resend } from "resend";
import {
  getPasswordResetEmailHtml,
  getPasswordResetEmailText,
  type PasswordResetEmailContent,
} from "@/lib/email/password-reset-html";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return process.env.EMAIL_FROM?.trim() || null;
}

export function getAppBaseUrlForEmail() {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "https://mivisita.app";
}

export function getSupportWhatsappUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_URL?.trim();
  if (!raw) return null;
  return raw;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();
  const from = getFromAddress();
  if (!resend || !from) {
    return { ok: false, error: "Email no configurado (RESEND_API_KEY o EMAIL_FROM)." };
  }

  const baseUrl = getAppBaseUrlForEmail();
  const payload: PasswordResetEmailContent = {
    resetUrl,
    baseUrl,
    supportWhatsappUrl: getSupportWhatsappUrl(),
  };

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Restablecer contraseña · MiVisita",
    html: getPasswordResetEmailHtml(payload),
    text: getPasswordResetEmailText(payload),
  });

  if (error) {
    console.error("[resend] password reset email failed", error);
    return { ok: false, error: error.message ?? "Error al enviar correo." };
  }

  return { ok: true };
}
