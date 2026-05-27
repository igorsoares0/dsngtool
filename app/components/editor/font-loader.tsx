"use client";

export const AVAILABLE_FONTS = [
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

const GOOGLE_FONTS = AVAILABLE_FONTS
  .filter((f) => f.category !== "system")
  .map((f) => f.family.replace(/ /g, "+") + ":wght@300;400;500;600;700")
  .join("&family=");

const GOOGLE_FONTS_URL = `https://fonts.googleapis.com/css2?family=${GOOGLE_FONTS}&display=swap`;

export default function FontLoader() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
    </>
  );
}
