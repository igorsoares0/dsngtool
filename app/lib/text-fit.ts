import Konva from "konva";
import { resolveFontFamily } from "./fonts";
import type { TextElement } from "../types/editor";

/** A text element that may not have an id yet (generated, pre-`loadTemplate`). */
export type MeasurableText = Omit<TextElement, "id"> & { id?: string };

function buildNode(el: MeasurableText, fontSize: number, wrapWidth?: number) {
  return new Konva.Text({
    text: el.textTransform === "uppercase" ? el.text.toUpperCase() : el.text,
    fontSize,
    fontFamily: resolveFontFamily(el.fontFamily),
    fontStyle: el.fontStyle || "normal",
    lineHeight: el.lineHeight || 1.2,
    letterSpacing: el.letterSpacing || 0,
    padding: 0,
    ...(wrapWidth ? { width: wrapWidth, wrap: "word" } : {}),
  });
}

// Measure the natural (unconstrained) width of a text element using an
// offscreen Konva.Text — same engine as the canvas, so it stays accurate.
export function measureTextWidth(el: MeasurableText): number {
  const node = buildNode(el, el.fontSize);
  const w = node.width();
  node.destroy();
  return w;
}

/** Height the text occupies once wrapped to `wrapWidth`. */
function measureWrappedHeight(el: MeasurableText, fontSize: number, wrapWidth: number): number {
  const node = buildNode(el, fontSize, wrapWidth);
  const h = node.height();
  node.destroy();
  return h;
}

// Never shrink past this fraction of the designed size — below it the layout
// reads as broken anyway, and truncating is the honest failure.
const MIN_SCALE = 0.65;
const STEP = 0.96;
const MAX_STEPS = 12;

/**
 * Fit a generated text element to the space the template gave it.
 *
 * Two overflow modes, depending on how the template defined the box:
 *  - auto-width (the default): the box hugs the text, so overflow is horizontal
 *    — the text runs off the canvas. Bounded by the space on the anchor side.
 *  - explicit width (`autoWidth === false`): the text wraps, so overflow is
 *    vertical — more lines than the box is tall.
 *
 * Auto-width boxes are always re-measured and re-anchored, not only when they
 * overflow: the generation step scales `fontSize`, so the template's stored
 * width is stale either way, and a centred headline would drift off its axis
 * if the box grew from its left edge.
 *
 * Returns the fields to override, or `null` when nothing needs to change.
 */
export function fitTextToBox(
  el: MeasurableText,
  canvas: { width: number; height: number }
): { fontSize: number; width?: number; x?: number } | null {
  const floor = el.fontSize * MIN_SCALE;

  if (el.autoWidth === false) {
    if (measureWrappedHeight(el, el.fontSize, el.width) <= el.height) return null;

    let size = el.fontSize;
    for (let i = 0; i < MAX_STEPS; i++) {
      size = Math.max(size * STEP, floor);
      if (measureWrappedHeight(el, size, el.width) <= el.height || size <= floor) break;
    }
    return { fontSize: Math.round(size) };
  }

  // Auto-width: how far the box can grow before leaving the canvas depends on
  // which edge the alignment pins it to.
  const centerX = el.x + el.width / 2;
  const available =
    el.align === "center"
      ? 2 * Math.min(centerX, canvas.width - centerX)
      : el.align === "right"
        ? el.x + el.width
        : canvas.width - el.x;

  let size = el.fontSize;
  const measured = measureTextWidth(el);

  if (available > 0 && measured > available) {
    // Width scales close to linearly with font size, so one proportional step
    // lands near the answer; the loop corrects for kerning and rounding.
    size = Math.max(el.fontSize * (available / measured), floor);
    for (let i = 0; i < MAX_STEPS; i++) {
      if (measureTextWidth({ ...el, fontSize: size }) <= available || size <= floor) break;
      size = Math.max(size * STEP, floor);
    }
  }

  const fontSize = Math.round(size);
  const width = Math.ceil(measureTextWidth({ ...el, fontSize }));
  if (fontSize === el.fontSize && Math.abs(width - el.width) <= 1) return null;

  // Keep the alignment anchor fixed as the box resizes — same correction the
  // canvas applies on render, done up front so there's no visible reflow.
  const factor = el.align === "center" ? 0.5 : el.align === "right" ? 1 : 0;
  return { fontSize, width, x: el.x + (el.width - width) * factor };
}
