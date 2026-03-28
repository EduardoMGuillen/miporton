import { redirect } from "next/navigation";
import { getSession, type SessionData, type SessionRole } from "@/lib/auth";

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireRole(roles: SessionRole[]): Promise<SessionData> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/");
  return session;
}

export function dashboardPathByRole(role: SessionRole) {
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "RESIDENTIAL_ADMIN") return "/residential-admin";
  if (role === "RESIDENT") return "/resident";
  return "/guard";
}
