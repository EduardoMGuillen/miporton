import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const DEFAULT_SUPER_ADMIN = {
  fullName: "Super Admin MiPorton",
  email: "admin@miporton.app",
  password: "Admin123!",
};

export async function ensureSuperAdminExists() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: DEFAULT_SUPER_ADMIN.email },
      select: { id: true },
    });

    if (existing) return;

    const passwordHash = await bcrypt.hash(DEFAULT_SUPER_ADMIN.password, 10);

    await prisma.user.create({
      data: {
        fullName: DEFAULT_SUPER_ADMIN.fullName,
        email: DEFAULT_SUPER_ADMIN.email,
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
  } catch (error) {
    console.error("Failed to ensure super admin user:", error);
  }
}

export const defaultSuperAdminCredentials = DEFAULT_SUPER_ADMIN;
