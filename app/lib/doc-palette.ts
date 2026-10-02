import type { Page } from "../types/editor";

const HEX = /^#([0-9a-f]{6})$/i;

/** The colours a design already uses, most-used first: element fills and
 *  strokes, text shadows, page backgrounds and gradient stops. Drives the
 *  inspector's "FROM THIS DESIGN" swatches. */
export function docPalette(pages: Page[], max = 6): string[] {
  const counts = new Map<string, number>();
  const add = (c: unknown) => {
    if (typeof c !== "string" || !HEX.test(c)) return;
    const k = c.toUpperCase();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  };
  for (const p of pages) {
    add(p.backgroundColor);
    p.backgroundGradient?.colorStops.forEach(add);
    for (const el of p.elements) {
      if (el.type === "text") {
        add(el.fill);
        if (el.shadowBlur || el.shadowOffsetX || el.shadowOffsetY) add(el.shadowColor);
      } else if (el.type === "shape") {
        add(el.fill);
        if (el.strokeWidth) add(el.stroke);
        el.gradient?.colorStops.forEach(add);
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([c]) => c);
}
