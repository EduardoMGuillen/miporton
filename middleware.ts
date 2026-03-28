import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "@/lib/session-token";

/**
 * Sliding session: while the JWT is still valid, re-issue cookie + token so active users
 * are not logged out by the max-age window. Only explicit logout clears the cookie.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(token);
  if (!session) {
    return NextResponse.next();
  }

  const newToken = await createSessionToken(session);
  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE_NAME, newToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

export const config = {
  matcher: [
    "/resident/:path*",
    "/guard/:path*",
    "/residential-admin/:path*",
    "/super-admin/:path*",
  ],
};
