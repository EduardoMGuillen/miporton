import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "miporton_session";

export type SessionRole = "SUPER_ADMIN" | "RESIDENTIAL_ADMIN" | "RESIDENT" | "GUARD";

export type SessionData = {
  userId: string;
  fullName: string;
  role: SessionRole;
  residentialId: string | null;
};

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "change-this-in-production-miporton-secret",
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
  return readSessionToken(token);
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
