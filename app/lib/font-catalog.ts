// The font catalog as plain data — no next/font import, so server code (the AI
// route) can read the family list without pulling in the font loader.
// `fonts.ts` re-exports these and owns the next/font side.

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

export const FONT_FAMILY_NAMES = AVAILABLE_FONTS.map((f) => f.family);
