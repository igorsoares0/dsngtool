import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import SwRegister from "./components/sw-register";
import ThemeSync from "./components/theme-sync";
import { FONT_VARIABLES } from "./lib/fonts";

// The chrome's two typefaces. These are separate from the 14 *document* fonts
// in lib/fonts.ts — those keep their own `--font-*-design` variables and must
// not be touched, or stored `fontFamily` values stop resolving.
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
// ahead of the stylesheet — there is no CSP on this app.
const THEME_SCRIPT = `try{var t=localStorage.getItem('modo-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${geistMono.variable} ${FONT_VARIABLES} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
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
