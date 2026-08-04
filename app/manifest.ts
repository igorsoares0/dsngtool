import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Modo — Visual Editor",
    short_name: "Modo",
    description: "Browser-based visual design editor",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    // A manifest can't carry a light/dark pair — light is the default theme.
    background_color: "#eceae5",
    theme_color: "#eceae5",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
