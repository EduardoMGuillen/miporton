const NEXUS_URL = "https://www.nexusglobalsuministros.com/";

export type PasswordResetEmailContent = {
  resetUrl: string;
  baseUrl: string;
  supportWhatsappUrl: string | null;
};

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function getPasswordResetEmailHtml({
  resetUrl,
  baseUrl,
  supportWhatsappUrl,
}: PasswordResetEmailContent): string {
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/logomivisitaresized.png`;
  const privacyUrl = `${baseUrl.replace(/\/$/, "")}/politicas-de-privacidad`;
  const termsUrl = `${baseUrl.replace(/\/$/, "")}/terminos-de-uso`;
  const safeReset = escapeHtml(resetUrl);

  const whatsappBlock = supportWhatsappUrl
    ? `
          <tr>
            <td style="padding:16px 24px 8px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#334155;line-height:1.5;">
              ¿Necesitas ayuda? Escríbenos por WhatsApp.
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px 24px;text-align:center;">
              <a href="${escapeHtml(supportWhatsappUrl)}" style="display:inline-block;padding:10px 20px;background-color:#25D366;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">Contactar por WhatsApp</a>
            </td>
          </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(180deg,#3b82f6 0%,#1d4ed8 100%);padding:20px 24px;text-align:center;">
              <img src="${escapeHtml(logoUrl)}" alt="MiVisita" width="120" height="120" style="display:block;margin:0 auto 12px auto;border:0;max-width:120px;height:auto;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">Restablecimiento de contraseña</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#334155;line-height:1.6;">
              <p style="margin:0 0 16px 0;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>MiVisita</strong>. Si fuiste tú, usa el botón de abajo. El enlace caduca en aproximadamente una hora.</p>
              <p style="margin:0 0 16px 0;">Si no solicitaste este cambio, puedes ignorar este correo con seguridad.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;text-align:center;">
              <a href="${safeReset}" style="display:inline-block;padding:14px 28px;background-color:#16a34a;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;text-decoration:none;border-radius:10px;">Restablecer contraseña</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px 24px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;line-height:1.5;word-break:break-all;">
              Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
              <a href="${safeReset}" style="color:#1d4ed8;">${safeReset}</a>
            </td>
          </tr>
          ${whatsappBlock}
          <tr>
            <td style="padding:20px 24px;border-top:1px solid #e2e8f0;background-color:#f8fafc;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;line-height:1.6;">
              <p style="margin:0 0 8px 0;">
                Powered by <a href="${NEXUS_URL}" style="color:#1d4ed8;font-weight:bold;text-decoration:none;">Nexus Global</a>
              </p>
              <p style="margin:0;">
                <a href="${escapeHtml(privacyUrl)}" style="color:#475569;text-decoration:underline;">Políticas de privacidad</a>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(termsUrl)}" style="color:#475569;text-decoration:underline;">Términos de uso</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getPasswordResetEmailText({
  resetUrl,
  baseUrl,
  supportWhatsappUrl,
}: PasswordResetEmailContent): string {
  const lines = [
    "MiVisita — Restablecimiento de contraseña",
    "",
    "Recibimos una solicitud para restablecer tu contraseña.",
    "Si fuiste tú, abre este enlace (válido por tiempo limitado):",
    resetUrl,
    "",
    "Si no solicitaste el cambio, ignora este mensaje.",
    "",
    `Powered by Nexus Global: ${NEXUS_URL}`,
    `Privacidad: ${baseUrl.replace(/\/$/, "")}/politicas-de-privacidad`,
    `Términos: ${baseUrl.replace(/\/$/, "")}/terminos-de-uso`,
  ];
  if (supportWhatsappUrl) {
    lines.push("", `WhatsApp: ${supportWhatsappUrl}`);
  }
  return lines.join("\n");
}
