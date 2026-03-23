import { SignJWT, jwtVerify } from "jose";

/** Cookie + JWT lifetime. Renewed on each visit to protected routes (sliding session). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const SESSION_COOKIE_NAME = "mivisita_session";

export type SessionRole = "SUPER_ADMIN" | "RESIDENTIAL_ADMIN" | "RESIDENT" | "GUARD";

export type SessionData = {
  userId: string;
  fullName: string;
  role: SessionRole;
  residentialId: string | null;
};

function getSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_SECRET ?? "change-this-in-production-mivisita-secret",
  );
}

export async function createSessionToken(session: SessionData) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionData | null> {
  try {
    const result = await jwtVerify(token, getSecret());
    const p = result.payload as Record<string, unknown>;
    return {
      userId: String(p.userId ?? ""),
      fullName: String(p.fullName ?? ""),
      role: p.role as SessionRole,
      residentialId: p.residentialId == null ? null : String(p.residentialId),
    };
  } catch {
    return null;
  }
}
