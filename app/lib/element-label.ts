import type { EditorElement } from "../types/editor";

/** The chrome's name for an element: a text layer is its (quoted, trimmed)
 *  copy; everything else is its kind. Elements carry no user-given name. */
export function elementLabel(el: EditorElement, max = 28): string {
  if (el.type === "text") {
    const t = el.text.replace(/\s+/g, " ").trim();
    if (t) return `“${t.length > max ? `${t.slice(0, max - 1)}…` : t}”`;
    return "Text";
  }
  if (el.type === "image") return "Image";
  return el.shapeType === "ellipse"
    ? "Ellipse"
    : el.shapeType === "triangle"
      ? "Triangle"
      : el.shapeType === "line"
        ? "Line"
        : "Rectangle";
}

/** "TEXT" / "SHAPE" / "IMAGE" — the mono kind tag. */
export function elementKind(el: EditorElement): string {
  return el.type.toUpperCase();
}
