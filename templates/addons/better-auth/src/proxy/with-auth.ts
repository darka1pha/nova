import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];

/**
 * Compose into the root `src/proxy.ts` alongside the next-intl proxy handler,
 * e.g. by running this check first and only falling through to the i18n
 * proxy when the route isn't protected or a session cookie exists.
 */
export function withAuth(request: NextRequest) {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.includes(prefix),
  );

  if (!isProtected) return null;

  const sessionCookie = request.cookies.get("better-auth.session_token");
  if (!sessionCookie) {
    const loginUrl = new URL("/", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return null;
}
