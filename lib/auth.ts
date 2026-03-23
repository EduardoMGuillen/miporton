import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "mivisita_session";

export type SessionRole = "SUPER_ADMIN" | "RESIDENTIAL_ADMIN" | "RESIDENT" | "GUARD";

export type SessionData = {
  userId: string;
  fullName: string;
  role: SessionRole;
  residentialId: string | null;
};

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "change-this-in-production-mivisita-secret",
);

export async function createSessionToken(session: SessionData) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function readSessionToken(token: string) {
  try {
    const result = await jwtVerify(token, secret);
    return result.payload as SessionData;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return null;
  const session = await readSessionToken(token);
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
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
