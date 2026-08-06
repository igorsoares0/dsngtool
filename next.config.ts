import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pinned because something in the launch environment was feeding Next a
  // Windows-style path for the root. Under WSL that string is not absolute, so
  // Next resolved it against the cwd and Turbopack emitted its static assets
  // into a literal `C:\allsaas\dsgntool/` folder inside the project. Setting
  // both keys explicitly overrides whatever the environment supplies — they
  // must hold the same value or Next warns and prefers outputFileTracingRoot.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  async headers() {
    return [
      {
        // Baseline security headers for every route. Content-Security-Policy is
        // deliberately NOT here — it carries a per-request nonce and so is set
        // in proxy.ts. Two CSP headers would be intersected by the browser, and
        // a static one would only ever be the weaker of the pair.
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // TLS is terminated by Coolify's proxy, which does not send this.
          // Two years with preload is the submission requirement; the app is
          // https-only in production, so there is no http path to preserve.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // Nothing here uses a camera, mic, or geolocation.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        // The service worker must never be cached, so clients always pick up a
        // new version on the next load.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
