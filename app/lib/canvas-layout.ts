import type { CanvasFormat } from "../types/editor";
import { PAGE_GAP } from "../types/editor";

/**
 * Geometry of the stacked artboards, in one place.
 *
 * The canvas, the DOM overlays anchored to it (inline text editor, empty-state
 * hint, per-page controls) and the exporter all have to agree on exactly where
 * page N sits on screen. They used to each do their own centring arithmetic,
 * which is how the exporter ended up ignoring pan.
 */

/** Screen-space margin above the stack once it is taller than the viewport. */
export const STACK_TOP_MARGIN = 40;

/** Total height of the stack in canvas units, gaps included. */
export function documentHeight(pageCount: number, format: CanvasFormat): number {
  return pageCount * format.height + Math.max(0, pageCount - 1) * PAGE_GAP;
}

export interface StackGeometry {
  /** Screen x of every artboard's left edge. */
  offsetX: number;
  /** Screen y of the first artboard's top edge. */
  offsetY: number;
  /** Screen y of artboard `index`'s top edge. */
  pageTop: (index: number) => number;
}

export function stackGeometry(opts: {
  containerWidth: number;
  containerHeight: number;
  format: CanvasFormat;
  pageCount: number;
  scale: number;
  panX: number;
  panY: number;
}): StackGeometry {
  const { containerWidth, containerHeight, format, pageCount, scale, panX, panY } = opts;

  const offsetX = (containerWidth - format.width * scale) / 2 + panX;

  // Centre the stack while it fits, then pin it to the top and let panning do
  // the rest. Centring a stack taller than the viewport would open the project
  // showing its middle instead of page one.
  const docH = documentHeight(pageCount, format) * scale;
  const centred = (containerHeight - docH) / 2;
  const offsetY = Math.max(STACK_TOP_MARGIN, centred) + panY;

  return {
    offsetX,
    offsetY,
    pageTop: (index: number) => offsetY + index * (format.height + PAGE_GAP) * scale,
  };
}
