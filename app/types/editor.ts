export interface BaseElement {
  id: string;
  type: "text" | "image" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: "left" | "center" | "right";
  fontStyle?: string;
  textDecoration?: string;
  textTransform?: "none" | "uppercase";
  lineHeight?: number;
  letterSpacing?: number;
  // When false, the user set an explicit width (text wraps to it). Otherwise the
  // box auto-fits the text. Defaults to auto (undefined === auto).
  autoWidth?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  flipX?: boolean;
  flipY?: boolean;
  cornerRadius?: number;
  shadowColor?: string;
  shadowBlur?: number;
  filterBlur?: number;
  filterBrightness?: number;
  filterContrast?: number;
  filterSaturation?: number;
  filterGrayscale?: boolean;
  filterSepia?: boolean;
  filterInvert?: boolean;
}

export interface GradientFill {
  type: "linear" | "radial";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startRadius?: number;
  endRadius?: number;
  colorStops: Array<number | string>;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: "rectangle" | "ellipse" | "triangle" | "line";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  gradient?: GradientFill;
}

export type EditorElement = TextElement | ImageElement | ShapeElement;

export interface CanvasFormat {
  label: string;
  width: number;
  height: number;
}

export const CANVAS_FORMATS: CanvasFormat[] = [
  { label: "Instagram Post", width: 1080, height: 1080 },
  { label: "Instagram Story", width: 1080, height: 1920 },
  { label: "Pinterest", width: 1000, height: 1500 },
];

/** URL slugs for the presets, as used by `/?new=1&format=<slug>` (the
 *  dashboard's format cards and the landing's sign-up links). */
export const FORMAT_SLUGS = {
  post: CANVAS_FORMATS[0],
  story: CANVAS_FORMATS[1],
  pinterest: CANVAS_FORMATS[2],
} as const satisfies Record<string, CanvasFormat>;

export type FormatSlug = keyof typeof FORMAT_SLUGS;

/** One artboard. A project is an ordered stack of these, rendered top to bottom. */
export interface Page {
  id: string;
  elements: EditorElement[];
  backgroundColor: string;
  backgroundGradient: GradientFill | null;
}

/** Vertical gap between stacked artboards, in *screen* pixels — constant
 *  across zoom, so there is always room for the page label between two pages. */
export const PAGE_GAP = 96;

/**
 * Ceiling on pages per project. Not arbitrary: the whole project is pushed as
 * one JSON blob and the server refuses anything over MAX_PROJECT_BYTES (512KB,
 * app/lib/server/storage.ts) with a 413 — which project-sync treats as terminal
 * and stops retrying, stranding the work on one device. Typical pages are a few
 * KB, so this keeps a full project an order of magnitude clear of that wall.
 */
export const MAX_PAGES = 30;
