import type { Metadata, Viewport } from "next";
import { Inter_Tight, DM_Sans } from "next/font/google";
import "./globals.css";
import SwRegister from "./components/sw-register";
import { FONT_VARIABLES } from "./lib/fonts";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Modo — Visual Editor",
  description: "Browser-based visual design editor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Modo",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${dmSans.variable} ${FONT_VARIABLES} h-full`}
    >
      <body className="h-full font-[family-name:var(--font-inter-tight)]">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
