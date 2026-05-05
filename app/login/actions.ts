"use server";

import { timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth";
import { dashboardPathByRole } from "@/lib/authorization";
import { decryptOtp, encryptOtp } from "@/lib/otp-crypto";
import { DEFAULT_RESIDENT_OTP } from "@/lib/otp-default";
import { generateResidentOneTimePassword } from "@/lib/otp-generator";

const loginSchema = z.object({
  email: z.string().email("Correo invalido."),
  password: z.string().min(1, "Password requerido."),
});

function safeEqualText(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function loginAction(_prevState: string | null, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Credenciales invalidas.";
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      residential: {
        select: { name: true, isSuspended: true },
      },
    },
  });

  if (!user) return "Correo o password incorrectos.";

  const isPasswordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!isPasswordValid) {
    if (user.role !== "RESIDENT") return "Correo o password incorrectos.";

    const currentOtpCipher = user.oneTimePasswordCipher;
    let expectedOtp = DEFAULT_RESIDENT_OTP;
    if (currentOtpCipher) {
      try {
        expectedOtp = decryptOtp(currentOtpCipher);
      } catch {
        return "Correo o password incorrectos.";
      }
    }

    if (!safeEqualText(parsed.data.password, expectedOtp)) {
      return "Correo o password incorrectos.";
    }

    const nextOtpCipher = encryptOtp(generateResidentOneTimePassword());
    const rotated = await prisma.user.updateMany({
      where: {
        id: user.id,
        isSuspended: false,
        oneTimePasswordCipher: currentOtpCipher,
      },
      data: {
        oneTimePasswordCipher: nextOtpCipher,
        oneTimePasswordCreatedAt: new Date(),
        oneTimePasswordCreatedById: null,
      },
    });
    if (rotated.count !== 1) {
      return "Correo o password incorrectos.";
    }
  }

  if (user.isSuspended) {
    const residentialName = user.residential?.name ?? "tu residencial";
    return `Cuenta suspendida por la Administracion de "${residentialName}", contactarlos para mas informacion`;
  }

  if (user.role !== "SUPER_ADMIN" && user.residentialId) {
    const residential = user.residential;
    if (residential?.isSuspended) {
      return "Tu residencial esta suspendida temporalmente. Contacta al administrador principal.";
    }
  }

  await setSessionCookie({
    userId: user.id,
    fullName: user.fullName,
    role: user.role,
    residentialId: user.residentialId ?? null,
  });

  redirect(dashboardPathByRole(user.role));
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
