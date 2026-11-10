import { NextResponse, type NextRequest } from "next/server";

// Next 16 renamed `middleware` -> `proxy`. There are no accounts any more (the
// license gate is client-side, see app/components/license/license-gate.tsx), so
// all this does is attach the per-request Content-Security-Policy.

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
 *    (older designs point at hosted images; device images are blob: URLs).
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
    // by us, hence frame-src. AI generation calls Anthropic straight from the
    // browser with the user's own key (app/lib/ai/generate.ts).
    `connect-src 'self' https://*.paddle.com https://api.anthropic.com${isDev ? " ws: http://localhost:*" : ""}`,
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
  const nonce = crypto.randomUUID();
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

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
  // Page navigations only: API routes return JSON and need no CSP, and static
  // files (Next internals, PWA assets, anything with an extension) are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest|icons|sw.js|.*\\.).*)"],
};
