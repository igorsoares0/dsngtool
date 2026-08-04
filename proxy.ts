import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Next 16 renamed `middleware` -> `proxy`. This gates the editor behind auth.
//
// Optimistic check only: it verifies a session cookie is present, not that it's
// valid against the DB (that would mean a round-trip on every navigation). The
// real validation still happens server-side in route handlers via
// app/lib/server/session.ts. An attacker forging a cookie gets bounced there.

// Public routes reachable while signed out.
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  // Signed out + private route -> send to login, remembering where they wanted.
  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Signed in + auth page -> bounce to the editor.
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Page navigations only. All of /api is excluded: an API client wants 401
  // JSON, not a redirect to an HTML login page, and some routes (the Paddle
  // webhook, better-auth itself) are anonymous by design. Every other route
  // checks the session server-side — /api/ai/generate 401s without one, since
  // its quota hangs off the user id. Also excludes Next internals and any file
  // with an extension (static/PWA assets).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest|icons|sw.js|.*\\.).*)"],
};
