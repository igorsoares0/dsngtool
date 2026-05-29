import type {
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
} from "../types/editor";

export type ElementInput =
  | Omit<TextElement, "id">
  | Omit<ImageElement, "id">
  | Omit<ShapeElement, "id">;

export const CLIPBOARD_MARKER = "dsgntool/v1:";

interface ClipboardPayload {
  marker: typeof CLIPBOARD_MARKER;
  elements: EditorElement[];
}

export function serializeElements(elements: EditorElement[]): string {
  const payload: ClipboardPayload = {
    marker: CLIPBOARD_MARKER,
    elements,
  };
  return CLIPBOARD_MARKER + JSON.stringify(payload);
}

export function parseClipboardPayload(text: string): EditorElement[] | null {
  if (!text || !text.startsWith(CLIPBOARD_MARKER)) return null;
  let parsed: ClipboardPayload;
  try {
    parsed = JSON.parse(text.slice(CLIPBOARD_MARKER.length));
  } catch {
    return null;
  }
  if (!parsed || parsed.marker !== CLIPBOARD_MARKER || !Array.isArray(parsed.elements)) {
    return null;
  }
  return parsed.elements;
}

export function stripIdsAndOffset(
  elements: EditorElement[],
  offset: number
): ElementInput[] {
  return elements.map((el) => {
    const { id: _id, ...rest } = el;
    void _id;
    return { ...rest, x: rest.x + offset, y: rest.y + offset } as ElementInput;
  });
}
