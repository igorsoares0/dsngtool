// The font catalog as plain data — no next/font import, so server code (the AI
// route) can read the family list without pulling in the font loader.
// `fonts.ts` re-exports these and owns the next/font side.

export type FontCategory =
  | "serif"
  | "sans-serif"
  | "display"
  | "script"
  | "monospace"
  | "system";

export interface AvailableFont {
  family: string;
  category: FontCategory;
}

// Order within a category drives the order inside its dropdown group.
export const AVAILABLE_FONTS: AvailableFont[] = [
  { family: "Playfair Display", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "DM Serif Display", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "Libre Baskerville", category: "serif" },
  { family: "EB Garamond", category: "serif" },
  { family: "Bodoni Moda", category: "serif" },
  { family: "Fraunces", category: "serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Raleway", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "DM Sans", category: "sans-serif" },
  { family: "Inter", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Josefin Sans", category: "sans-serif" },
  { family: "Quicksand", category: "sans-serif" },
  { family: "Outfit", category: "sans-serif" },
  { family: "Space Grotesk", category: "sans-serif" },
  { family: "Manrope", category: "sans-serif" },
  { family: "Bebas Neue", category: "display" },
  { family: "Anton", category: "display" },
  { family: "Oswald", category: "display" },
  { family: "Archivo Black", category: "display" },
  { family: "Abril Fatface", category: "display" },
  { family: "Dancing Script", category: "script" },
  { family: "Great Vibes", category: "script" },
  { family: "Caveat", category: "script" },
  { family: "JetBrains Mono", category: "monospace" },
  { family: "Arial", category: "system" },
  { family: "Georgia", category: "system" },
];

// Group order and headings for the typography dropdown's <optgroup>s.
export const FONT_CATEGORY_ORDER: FontCategory[] = [
  "serif",
  "sans-serif",
  "display",
  "script",
  "monospace",
  "system",
];

export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  serif: "Serif",
  "sans-serif": "Sans-serif",
  display: "Display",
  script: "Script",
  monospace: "Mono",
  system: "System",
};

// Pre-grouped for the dropdown, in FONT_CATEGORY_ORDER. Empty groups are
// dropped so removing a family from the catalog can't leave a bare heading.
export const FONTS_BY_CATEGORY: { category: FontCategory; label: string; fonts: AvailableFont[] }[] =
  FONT_CATEGORY_ORDER.map((category) => ({
    category,
    label: FONT_CATEGORY_LABELS[category],
    fonts: AVAILABLE_FONTS.filter((f) => f.category === category),
  })).filter((g) => g.fonts.length > 0);

export const FONT_FAMILY_NAMES = AVAILABLE_FONTS.map((f) => f.family);
