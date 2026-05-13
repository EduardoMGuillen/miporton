import { Resend } from "resend";

const DEFAULT_LEAD_INBOX = "eduardoguillendev@proton.me";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress() {
  return process.env.EMAIL_FROM?.trim() || null;
}

function getLeadInbox() {
  return process.env.LANDING_LEAD_EMAIL?.trim() || DEFAULT_LEAD_INBOX;
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendLandingLeadEmail(payload: {
  name: string;
  email: string;
  phone: string;
  residentialHint: string;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const resend = getResend();
  const from = getFromAddress();
  const to = getLeadInbox();
  if (!resend || !from) {
    return { ok: false, error: "RESEND_DISABLED" };
  }

  const { name, email, phone, residentialHint, message } = payload;
  const subject = `[MiVisita] Interés residencial · ${name}`;

  const lines = [
    `Nombre: ${name}`,
    `Correo: ${email}`,
    phone ? `Teléfono: ${phone}` : null,
    residentialHint ? `Residencial / contexto: ${residentialHint}` : null,
    "",
    "Mensaje:",
    message,
  ].filter((l) => l !== null);

  const text = lines.join("\n");
  const html = `
    <p><strong>Nuevo lead desde la landing MiVisita</strong></p>
    <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px;">
      <tr><td style="padding:6px 12px 6px 0;color:#64748b;">Nombre</td><td>${escapeHtml(name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#64748b;">Correo</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
      ${phone ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b;">Teléfono</td><td>${escapeHtml(phone)}</td></tr>` : ""}
      ${
        residentialHint
          ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b;">Residencial</td><td>${escapeHtml(residentialHint)}</td></tr>`
          : ""
      }
    </table>
    <p style="margin-top:16px;"><strong>Mensaje</strong></p>
    <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif;background:#f1f5f9;padding:12px;border-radius:8px;">${escapeHtml(
      message,
    )}</pre>
  `;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    replyTo: email,
    text,
    html,
  });

  if (error) {
    console.error("[resend] landing lead email failed", error);
    return { ok: false, error: "SEND_FAILED" };
  }

  return { ok: true };
}
