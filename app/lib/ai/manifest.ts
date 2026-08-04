import type { Template } from "../../data/templates";
import type {
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
  CanvasFormat,
  GradientFill,
} from "../../types/editor";

const HEX = /^#[0-9a-fA-F]{6}$/;

type TemplateElement =
  | Omit<TextElement, "id">
  | Omit<ShapeElement, "id">
  | Omit<ImageElement, "id">;

/**
 * The editable surface of a template, flattened for the model.
 *
 * Geometry is deliberately absent: the model never sees or writes x/y/width,
 * so it cannot produce a broken layout. It fills content into slots and swaps
 * the palette/typeface; the merge below puts everything back by index.
 */
export interface Manifest {
  template: string;
  category: string;
  format: string;
  slots: { role: string; current: string; maxChars: number }[];
  colors: string[];
  fonts: string[];
}

/** How the model asks for a background. Directions are tokens, never coordinates. */
export type BackgroundDirection =
  | "top-bottom"
  | "bottom-top"
  | "left-right"
  | "diagonal-down"
  | "diagonal-up";

export interface BackgroundSpec {
  treatment: "flat" | "linear" | "radial";
  direction: BackgroundDirection;
  stops: string[];
}

/** The model's response. Every array is positional against the manifest. */
export interface GenerationResult {
  texts: string[];
  palette: string[];
  fonts: string[];
  /** Font-size multiplier per slot — the typographic contrast dial. */
  scales: number[];
  background: BackgroundSpec;
  name: string;
}

// Bounds on the scale dial. Wide enough for real hierarchy, tight enough that
// the fit pass can still absorb the result without collapsing the design.
const SCALE_MIN = 0.8;
const SCALE_MAX = 1.6;

// Normalized 0–1 gradient endpoints — canvas-stage multiplies these by the
// format dimensions at render time, so they must not be pixel values.
const DIRECTIONS: Record<BackgroundDirection, [number, number, number, number]> = {
  "top-bottom": [0.5, 0, 0.5, 1],
  "bottom-top": [0.5, 1, 0.5, 0],
  "left-right": [0, 0.5, 1, 0.5],
  "diagonal-down": [0, 0, 1, 1],
  "diagonal-up": [0, 1, 1, 0],
};

/**
 * Turn a background spec into a GradientFill, or null for a flat fill.
 * Anything malformed degrades to flat rather than throwing — a missing
 * gradient is a duller design, not a broken one.
 */
export function buildBackgroundGradient(spec: BackgroundSpec | undefined): GradientFill | null {
  if (!spec || spec.treatment === "flat") return null;

  const stops = (spec.stops ?? []).filter((s) => HEX.test(s));
  if (stops.length < 2) return null;

  const colorStops: Array<number | string> = [];
  stops.forEach((color, i) => {
    colorStops.push(i / (stops.length - 1), color);
  });

  if (spec.treatment === "radial") {
    return {
      type: "radial",
      startX: 0.5,
      startY: 0.5,
      endX: 0.5,
      endY: 0.5,
      startRadius: 0,
      endRadius: 0.75,
      colorStops,
    };
  }

  const [startX, startY, endX, endY] =
    DIRECTIONS[spec.direction] ?? DIRECTIONS["top-bottom"];
  return { type: "linear", startX, startY, endX, endY, colorStops };
}

function isText(el: TemplateElement): el is Omit<TextElement, "id"> {
  return el.type === "text";
}
function isShape(el: TemplateElement): el is Omit<ShapeElement, "id"> {
  return el.type === "shape";
}

/** Deterministic role labels, ranked by font size — the model needn't infer them. */
function roleFor(rank: number, total: number): string {
  if (rank === 0) return "headline";
  if (rank === 1 && total > 2) return "subhead";
  return "body";
}

export function buildManifest(template: Template): Manifest {
  const texts = template.elements.filter(isText);

  // Rank by size so "headline" means the visually dominant slot, not the first
  // one in paint order.
  const bySize = [...texts].sort((a, b) => b.fontSize - a.fontSize);
  const rank = new Map(bySize.map((el, i) => [el, i]));

  const colors: string[] = [];
  const fonts: string[] = [];
  const pushColor = (c: unknown) => {
    if (typeof c === "string" && HEX.test(c) && !colors.includes(c)) colors.push(c);
  };

  pushColor(template.backgroundColor);
  for (const el of template.elements) {
    if (isText(el)) {
      pushColor(el.fill);
      if (!fonts.includes(el.fontFamily)) fonts.push(el.fontFamily);
    } else if (isShape(el)) {
      pushColor(el.fill);
      pushColor(el.stroke);
      // colorStops alternate [offset, color, offset, color, ...]
      for (const stop of el.gradient?.colorStops ?? []) pushColor(stop);
    }
  }

  return {
    template: template.name,
    category: template.category,
    format: `${template.format.width}x${template.format.height}`,
    slots: texts.map((el) => ({
      role: roleFor(rank.get(el) ?? 0, texts.length),
      current: el.text,
      // The hand-made copy already fits the box; allow modest growth and let
      // the client-side fit pass absorb the rest.
      maxChars: Math.max(12, Math.ceil(el.text.length * 1.25)),
    })),
    colors,
    fonts,
  };
}

/**
 * Merge a model response back onto its template.
 *
 * Pure and total — it never throws. Every value is looked up by index and
 * validated, and anything unusable (a bad hex, an unknown family, a miscounted
 * array) falls back to the template's original. A partly-usable response still
 * produces a design; `degraded` reports what was dropped so the caller can say
 * so rather than claim a clean generation.
 */
export function applyGeneration(
  template: Template,
  result: GenerationResult,
  allowedFonts: readonly string[]
): {
  elements: TemplateElement[];
  backgroundColor: string;
  backgroundGradient: GradientFill | null;
  format: CanvasFormat;
  name: string;
  /** Parts of the response that were unusable and fell back to the template. */
  degraded: string[];
} {
  const manifest = buildManifest(template);

  // Array lengths can't be constrained by the response schema, so a miscount is
  // always possible. Degrade per-array instead of discarding the generation:
  //
  //  - texts are independent per slot, so a short array just leaves the
  //    remaining slots on the template's original copy.
  //  - palette and fonts are *sets*. Applying half a new palette would mix new
  //    and old colours and can destroy the contrast the design relies on, so a
  //    miscount there drops that array wholesale and keeps the template's.
  const paletteUsable = result.palette?.length === manifest.colors.length;
  const fontsUsable = result.fonts?.length === manifest.fonts.length;

  const colorMap = new Map<string, string>();
  manifest.colors.forEach((from, i) => {
    const to = paletteUsable ? result.palette[i] : undefined;
    colorMap.set(from, HEX.test(to ?? "") ? (to as string) : from);
  });

  const fontMap = new Map<string, string>();
  manifest.fonts.forEach((from, i) => {
    const to = fontsUsable ? result.fonts[i] : undefined;
    fontMap.set(from, to && allowedFonts.includes(to) ? to : from);
  });

  const color = (c: string | undefined) => (c ? (colorMap.get(c) ?? c) : c);

  // Scales are advisory: missing or out-of-range values clamp to something
  // safe rather than rejecting an otherwise good generation.
  const scaleAt = (i: number) => {
    const raw = result.scales?.[i];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return 1;
    return Math.min(SCALE_MAX, Math.max(SCALE_MIN, raw));
  };

  let slot = 0;
  let filledSlots = 0;
  const elements = template.elements.map((el): TemplateElement => {
    if (isText(el)) {
      const i = slot++;
      const text = result.texts?.[i];
      const usable = typeof text === "string" && text.trim().length > 0;
      if (usable) filledSlots++;
      return {
        ...el,
        text: usable ? text : el.text,
        fontSize: Math.max(8, Math.round(el.fontSize * scaleAt(i))),
        fill: color(el.fill) as string,
        fontFamily: fontMap.get(el.fontFamily) ?? el.fontFamily,
      };
    }
    if (isShape(el)) {
      return {
        ...el,
        fill: color(el.fill) as string,
        stroke: color(el.stroke),
        gradient: el.gradient
          ? {
              ...el.gradient,
              colorStops: el.gradient.colorStops.map((s) =>
                typeof s === "string" ? (color(s) as string) : s
              ),
            }
          : undefined,
      };
    }
    return el;
  });

  const backgroundGradient = buildBackgroundGradient(result.background);

  const degraded: string[] = [];
  if (!paletteUsable) degraded.push("colours");
  if (!fontsUsable) degraded.push("fonts");
  if (filledSlots < manifest.slots.length) degraded.push("copy");

  return {
    elements,
    degraded,
    // When a gradient is present the flat colour is only a fallback (export
    // paths, gradient later removed), so anchor it to the gradient's first stop.
    backgroundColor: backgroundGradient
      ? ((backgroundGradient.colorStops[1] as string) ??
        (color(template.backgroundColor) as string))
      : (color(template.backgroundColor) as string),
    backgroundGradient,
    format: template.format,
    name: result.name?.trim() || template.name,
  };
}

/** Compact index used for template selection — names only, no geometry. */
export function buildTemplateIndex(templates: Template[]) {
  return templates.map((t) => ({
    name: t.name,
    category: t.category,
    format: `${t.format.width}x${t.format.height}`,
    slots: buildManifest(t).slots.map((s) => s.role),
  }));
}

export type { TemplateElement, EditorElement };
