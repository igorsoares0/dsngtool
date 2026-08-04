import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { POST_AUTH_PATH } from "./app/lib/routes";

// Next 16 renamed `middleware` -> `proxy`. This gates the editor behind auth.
//
// Optimistic check only: it verifies a session cookie is present, not that it's
// valid against the DB (that would mean a round-trip on every navigation). The
// real validation still happens server-side in route handlers via
// app/lib/server/session.ts. An attacker forging a cookie gets bounced there.

// Public routes reachable while signed out.
const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * Per-request Content-Security-Policy.
 *
 * Nonce-based rather than 'unsafe-inline': Next emits inline scripts (the RSC
 * payload) whose contents change per render, so a hash can't cover them and
 * allowing all inline script would leave script-src doing nothing. Next reads
 * the nonce back out of this header during SSR and stamps it onto its own
 * script tags — that is why the value goes on the *request* headers too.
 *
 * Notable choices:
 *  - 'strict-dynamic' lets a nonce'd bundle load further scripts, which is how
 *    Paddle.js gets in (it injects its own <script> at checkout time). Under
 *    strict-dynamic host allowlists are ignored for scripts, so there is
 *    deliberately no cdn.paddle.com entry here — it would be dead config.
 *  - style-src keeps 'unsafe-inline' and takes no nonce. This is an editor:
 *    Konva and the panels set inline style attributes on nearly every node, and
 *    a nonce in style-src would make browsers ignore 'unsafe-inline' and break
 *    the canvas. Inline style is a far weaker vector than inline script.
 *  - img-src allows https: because designs legitimately reference remote images
 *    (R2 assets today, arbitrary user URLs in an image element).
 */
function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    // React uses eval in development for server-stack reconstruction.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Paddle's checkout posts back to its own API; the iframe it opens is framed
    // by us, hence frame-src.
    `connect-src 'self' https://*.paddle.com${isDev ? " ws: http://localhost:*" : ""}`,
    "frame-src https://*.paddle.com",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // Skipped in dev, where the app is served over plain http on localhost.
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

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

  // Signed in + auth page -> bounce to the dashboard.
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL(POST_AUTH_PATH, request.url));
  }

  // Forwarded on the request so Next can extract the nonce while rendering, and
  // set on the response so the browser actually enforces the policy.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
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
