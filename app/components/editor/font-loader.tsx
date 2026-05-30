"use client";

// Fonts are now self-hosted via next/font (see app/lib/fonts.ts), so there is
// no runtime web-font request and nothing to load here. This component is kept
// as a no-op render and re-exports AVAILABLE_FONTS for existing imports.
export { AVAILABLE_FONTS } from "../../lib/fonts";

export default function FontLoader() {
  return null;
}
