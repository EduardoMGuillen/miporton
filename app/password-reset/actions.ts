"use server";

import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAppBaseUrlForEmail, sendPasswordResetEmail } from "@/lib/email/resend-client";
import { hashPasswordResetToken } from "@/lib/password-reset-token";

const GENERIC_REQUEST_MESSAGE =
  "Si el usuario es correcto y tu cuenta tiene correo de contacto, recibirás un enlace en ese correo para restablecer la contraseña.";

const NO_CONTACT_MESSAGE =
  "No tienes correo de contacto asignado en MiVisita. Comunícate con soporte para que puedan registrar tu correo y ayudarte a recuperar el acceso.";

const TOKEN_EXPIRY_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;

export type PasswordResetRequestState =
  | null
  | { kind: "generic"; message: string }
  | { kind: "no_contact"; message: string };

const requestSchema = z.object({
  email: z.string().email("Ingresa un usuario válido (formato de correo)."),
});

const resetSchema = z.object({
  token: z.string().min(1, "Enlace inválido."),
  password: z.string().min(6, "La contraseña debe tener mínimo 6 caracteres."),
  confirmPassword: z.string().min(1, "Confirma la contraseña."),
});

export async function requestPasswordResetAction(
  _prevState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const parsed = requestSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { kind: "generic", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      residential: { select: { isSuspended: true } },
    },
  });

  if (!user) {
    return { kind: "generic", message: GENERIC_REQUEST_MESSAGE };
  }

  const eligible =
    !user.isSuspended &&
    (user.role === "SUPER_ADMIN" ||
      (!!user.residentialId && !!user.residential && !user.residential.isSuspended));

  if (!eligible) {
    return { kind: "generic", message: GENERIC_REQUEST_MESSAGE };
  }

  const hasPersonalEmail = Boolean(user.personalEmail?.trim());
  if (!hasPersonalEmail) {
    return { kind: "no_contact", message: NO_CONTACT_MESSAGE };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.passwordResetToken.count({
    where: {
      userId: user.id,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentCount < MAX_REQUESTS_PER_HOUR) {
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashPasswordResetToken(rawToken);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      }),
    ]);

    const baseUrl = getAppBaseUrlForEmail();
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    const sent = await sendPasswordResetEmail(user.personalEmail!.trim(), resetUrl);
    if (!sent.ok) {
      console.error("[password-reset] send failed", sent.error);
    }
  }

  return { kind: "generic", message: GENERIC_REQUEST_MESSAGE };
}

export async function resetPasswordAction(_prevState: string | null, formData: FormData) {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Datos inválidos.";
  }

  if (parsed.data.password !== parsed.data.confirmPassword) {
    return "Las contraseñas no coinciden.";
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const now = new Date();

  const row = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: {
        select: { id: true, isSuspended: true, residentialId: true, residential: { select: { isSuspended: true } } },
      },
    },
  });

  if (!row) {
    return "El enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de inicio de sesión.";
  }

  const { user } = row;
  if (user.isSuspended) {
    return "No se puede restablecer la contraseña para esta cuenta. Contacta a tu administrador.";
  }
  if (user.residentialId && user.residential?.isSuspended) {
    return "No se puede restablecer la contraseña para esta cuenta. Contacta a tu administrador.";
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        id: { not: row.id },
      },
      data: { usedAt: now },
    }),
  ]);

  redirect("/login?reset=ok");
}
