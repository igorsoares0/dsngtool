import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Instrument_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "./components/sw-register";
import ThemeSync from "./components/theme-sync";
import { FONT_VARIABLES } from "./lib/fonts";

// The chrome's two typefaces. These are separate from the 28 *document* fonts
// in lib/fonts.ts — those keep their own `--font-*` variables (some suffixed
// `-design` to avoid colliding with the chrome's) and must not be touched, or
// stored `fontFamily` values stop resolving.
// No `weight` so next/font emits the variable font.
const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin", "latin-ext"],
});

// Every numeric readout in the UI.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Modo — Visual Editor",
  description: "Browser-based visual design editor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Modo",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceae5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};

// Runs before first paint so the stored theme is applied without a flash. It
// mutates <html class>, which is why <html> needs suppressHydrationWarning.
// Kept as a raw inline script rather than next/script so it lands in <head>
// ahead of the stylesheet; it carries the request nonce to satisfy the CSP set
// in proxy.ts (an external file would cost a round-trip on the critical path).
const THEME_SCRIPT = `try{var t=localStorage.getItem('modo-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading the nonce makes every route dynamic, which nonce-based CSP requires
  // anyway: a nonce baked into a static shell at build time would be reused
  // across all visitors and defeat the point.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${geistMono.variable} ${FONT_VARIABLES} h-full`}
    >
      <head>
        {/*
          suppressHydrationWarning is required, not cosmetic. Browsers implement
          "nonce hiding" from the HTML spec: once the CSP has been applied they
          blank the nonce *attribute* and keep the real value only on the
          element's .nonce property, so that a CSS attribute selector can't
          exfiltrate it. Hydration therefore compares the server's
          nonce="<uuid>" against a DOM that now reads nonce="" and reports a
          mismatch. The mismatch is the browser behaving correctly.

          The one on <html> does not cover this — suppressHydrationWarning
          applies only to the element it is set on, not to descendants.
        */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      {/* The body font comes from globals.css. */}
      <body className="h-full">
        {children}
        <ThemeSync />
        <SwRegister />
      </body>
    </html>
  );
}
