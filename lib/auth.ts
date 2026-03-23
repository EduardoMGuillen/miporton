import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
  type SessionData,
  type SessionRole,
} from "@/lib/session-token";

export { SESSION_COOKIE_NAME, type SessionData, type SessionRole };

export async function readSessionToken(token: string) {
  return verifySessionToken(token);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isSuspended: true },
    });
    if (!user || user.isSuspended) return null;
  } catch {
    return session;
  }

  if (session.role === "SUPER_ADMIN") return session;
  if (!session.residentialId) return session;

  try {
    const residential = await prisma.residential.findUnique({
      where: { id: session.residentialId },
      select: { isSuspended: true },
    });
    if (!residential || residential.isSuspended) return null;
  } catch {
    return session;
  }

  return session;
}

export async function setSessionCookie(session: SessionData) {
  const cookieStore = await cookies();
  const token = await createSessionToken(session);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
