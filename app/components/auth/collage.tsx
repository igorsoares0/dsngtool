"use client";

import DesignThumbnail from "../design-thumbnail";
import { TEMPLATES } from "../../data/templates";
import { templatePage } from "../../data/template-pages";

/** Two real starting templates, rotated on the paper — the auth screens'
 *  left half. Drawn from template data, so it can't drift from the catalog. */
export default function AuthCollage() {
  const square = TEMPLATES.find((t) => t.name === "Quote") ?? TEMPLATES[0];
  const tall = TEMPLATES.find((t) => t.name === "Ask Me") ?? TEMPLATES[1];

  return (
    <div className="relative h-[520px]" aria-hidden>
      <div
        className="absolute left-10 top-5 w-[320px] overflow-hidden shadow-[0_30px_60px_-12px_rgb(0_0_0/0.35)] -rotate-3"
        style={{ aspectRatio: `${square.format.width} / ${square.format.height}`, backgroundColor: square.backgroundColor }}
      >
        <DesignThumbnail pages={[templatePage(square)]} format={square.format} className="absolute inset-0" />
      </div>
      <div
        className="absolute left-[300px] top-[110px] w-[190px] overflow-hidden shadow-[0_30px_60px_-12px_rgb(0_0_0/0.35)] rotate-[4deg]"
        style={{ aspectRatio: `${tall.format.width} / ${tall.format.height}`, backgroundColor: tall.backgroundColor }}
      >
        <DesignThumbnail pages={[templatePage(tall)]} format={tall.format} className="absolute inset-0" />
      </div>
    </div>
  );
}
