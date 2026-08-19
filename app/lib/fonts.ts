// Self-hosted design fonts (next/font/google). Bundled at build time and
// served same-origin, so the service worker caches them and the editor works
// fully offline — no runtime request to fonts.googleapis.com.
//
// next/font scopes each family under a generated name (e.g. "__Playfair_…").
// The editor stores/reads the *human* family name ("Playfair Display") in
// elements and templates, so resolveFontFamily() translates human → generated
// at render time. Stored data never changes.
//
// Preloading: the original 14 families preload (see FONT_VARIABLES). The
// families added later carry `preload: false` — their @font-face rules still
// emit, so picking one just works, but the file is fetched on first use
// instead of on every cold load. canvas-stage.tsx listens for the
// `loadingdone` font event and re-measures + redraws, so a face that arrives
// late still lands correctly on the canvas.
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
  Bodoni_Moda,
  Fraunces,
  Outfit,
  Space_Grotesk,
  Manrope,
  Bebas_Neue,
  Anton,
  Oswald,
  Archivo_Black,
  Abril_Fatface,
  Dancing_Script,
  Great_Vibes,
  Caveat,
  JetBrains_Mono,
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

// Added 2026-08-19 to widen the catalog: display/condensed, script and mono
// faces, plus a few modern sans and high-contrast serifs. Weight is omitted
// where the family ships a variable axis; the five single-weight faces
// (Bebas Neue, Anton, Archivo Black, Abril Fatface, Great Vibes) must name
// "400" or next/font errors at build time. Bold and italic on those five are
// synthesised by the renderer, same as before for any face without the cut.
const bodoniModa = Bodoni_Moda({ subsets: ["latin"], variable: "--font-bodoni-moda", preload: false });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", preload: false });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", preload: false });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", preload: false });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", preload: false });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas-neue", preload: false });
const anton = Anton({ subsets: ["latin"], weight: ["400"], variable: "--font-anton", preload: false });
const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", preload: false });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: ["400"], variable: "--font-archivo-black", preload: false });
const abrilFatface = Abril_Fatface({ subsets: ["latin"], weight: ["400"], variable: "--font-abril-fatface", preload: false });
const dancingScript = Dancing_Script({ subsets: ["latin"], variable: "--font-dancing-script", preload: false });
const greatVibes = Great_Vibes({ subsets: ["latin"], weight: ["400"], variable: "--font-great-vibes", preload: false });
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", preload: false });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono", preload: false });

// The catalog itself lives in font-catalog.ts (no next/font dependency) so
// server code can read it. Re-exported here so existing imports keep working.
export {
  AVAILABLE_FONTS,
  FONT_FAMILY_NAMES,
  FONTS_BY_CATEGORY,
  FONT_CATEGORY_ORDER,
  FONT_CATEGORY_LABELS,
} from "./font-catalog";
export type { AvailableFont, FontCategory } from "./font-catalog";

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
  "Bodoni Moda": bodoniModa.style.fontFamily,
  Fraunces: fraunces.style.fontFamily,
  Outfit: outfit.style.fontFamily,
  "Space Grotesk": spaceGrotesk.style.fontFamily,
  Manrope: manrope.style.fontFamily,
  "Bebas Neue": bebasNeue.style.fontFamily,
  Anton: anton.style.fontFamily,
  Oswald: oswald.style.fontFamily,
  "Archivo Black": archivoBlack.style.fontFamily,
  "Abril Fatface": abrilFatface.style.fontFamily,
  "Dancing Script": dancingScript.style.fontFamily,
  "Great Vibes": greatVibes.style.fontFamily,
  Caveat: caveat.style.fontFamily,
  "JetBrains Mono": jetBrainsMono.style.fontFamily,
};

// Translate a stored family name into a value usable by canvas/CSS. System
// fonts (and anything unmapped) pass through unchanged.
export function resolveFontFamily(family: string): string {
  return FONT_FAMILY_MAP[family] ?? family;
}

// CSS variable classes for every self-hosted font. Applying these at the root
// emits the @font-face rules for all of them, so any family is renderable the
// moment it is selected. The original 14 also preload here (and are therefore
// SW-cached up front); the rest load on first use — see the note at the top.
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
  bodoniModa.variable,
  fraunces.variable,
  outfit.variable,
  spaceGrotesk.variable,
  manrope.variable,
  bebasNeue.variable,
  anton.variable,
  oswald.variable,
  archivoBlack.variable,
  abrilFatface.variable,
  dancingScript.variable,
  greatVibes.variable,
  caveat.variable,
  jetBrainsMono.variable,
].join(" ");
