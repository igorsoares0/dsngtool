// Self-hosted design fonts (next/font/google). Bundled at build time and
// served same-origin, so the service worker caches them and the editor works
// fully offline — no runtime request to fonts.googleapis.com.
//
// next/font scopes each family under a generated name (e.g. "__Playfair_…").
// The editor stores/reads the *human* family name ("Playfair Display") in
// elements and templates, so resolveFontFamily() translates human → generated
// at render time. Stored data never changes.
import {
  Playfair_Display,
  Cormorant_Garamond,
  DM_Serif_Display,
  Lora,
  Libre_Baskerville,
  EB_Garamond,
  Montserrat,
  Raleway,
  Poppins,
  DM_Sans,
  Inter,
  Nunito,
  Josefin_Sans,
  Quicksand,
} from "next/font/google";

const playfairDisplay = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-display" });
const cormorantGaramond = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-cormorant-garamond" });
const dmSerifDisplay = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], variable: "--font-dm-serif-display" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const libreBaskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-libre-baskerville" });
const ebGaramond = EB_Garamond({ subsets: ["latin"], variable: "--font-eb-garamond" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat" });
const raleway = Raleway({ subsets: ["latin"], variable: "--font-raleway" });
const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans-design" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter-design" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const josefinSans = Josefin_Sans({ subsets: ["latin"], variable: "--font-josefin-sans" });
const quicksand = Quicksand({ subsets: ["latin"], variable: "--font-quicksand" });

export interface AvailableFont {
  family: string;
  category: "serif" | "sans-serif" | "system";
}

// Order drives the typography dropdown.
export const AVAILABLE_FONTS: AvailableFont[] = [
  { family: "Playfair Display", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "DM Serif Display", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "EB Garamond", category: "serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Raleway", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "DM Sans", category: "sans-serif" },
  { family: "Inter", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Josefin Sans", category: "sans-serif" },
  { family: "Quicksand", category: "sans-serif" },
  { family: "Arial", category: "system" },
  { family: "Georgia", category: "system" },
];

// Human family name → the actual font-family value next/font generated.
const FONT_FAMILY_MAP: Record<string, string> = {
  "Playfair Display": playfairDisplay.style.fontFamily,
  "Cormorant Garamond": cormorantGaramond.style.fontFamily,
  "DM Serif Display": dmSerifDisplay.style.fontFamily,
  Lora: lora.style.fontFamily,
  "Libre Baskerville": libreBaskerville.style.fontFamily,
  "EB Garamond": ebGaramond.style.fontFamily,
  Montserrat: montserrat.style.fontFamily,
  Raleway: raleway.style.fontFamily,
  Poppins: poppins.style.fontFamily,
  "DM Sans": dmSans.style.fontFamily,
  Inter: inter.style.fontFamily,
  Nunito: nunito.style.fontFamily,
  "Josefin Sans": josefinSans.style.fontFamily,
  Quicksand: quicksand.style.fontFamily,
};

// Translate a stored family name into a value usable by canvas/CSS. System
// fonts (and anything unmapped) pass through unchanged.
export function resolveFontFamily(family: string): string {
  return FONT_FAMILY_MAP[family] ?? family;
}

// CSS variable classes for every self-hosted font. Applying these at the root
// emits the @font-face rules and triggers preloading, so the fonts are present
// (and SW-cached) regardless of which families are currently on the canvas.
export const FONT_VARIABLES = [
  playfairDisplay.variable,
  cormorantGaramond.variable,
  dmSerifDisplay.variable,
  lora.variable,
  libreBaskerville.variable,
  ebGaramond.variable,
  montserrat.variable,
  raleway.variable,
  poppins.variable,
  dmSans.variable,
  inter.variable,
  nunito.variable,
  josefinSans.variable,
  quicksand.variable,
].join(" ");
