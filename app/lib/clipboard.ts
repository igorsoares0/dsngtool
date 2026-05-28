import type {
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
} from "../types/editor";

type ElementInput =
  | Omit<TextElement, "id">
  | Omit<ImageElement, "id">
  | Omit<ShapeElement, "id">;

const CLIPBOARD_MARKER = "dsgntool/v1:";
const PASTE_OFFSET = 20;

let pasteCount = 0;
let lastSignature = "";

interface ClipboardPayload {
  marker: typeof CLIPBOARD_MARKER;
  elements: EditorElement[];
}

export async function writeElementsToClipboard(elements: EditorElement[]): Promise<boolean> {
  if (elements.length === 0) return false;
  const payload: ClipboardPayload = { marker: CLIPBOARD_MARKER, elements };
  const text = CLIPBOARD_MARKER + JSON.stringify(payload);
  try {
    await navigator.clipboard.writeText(text);
    lastSignature = text;
    pasteCount = 0;
    return true;
  } catch {
    return false;
  }
}

export async function readElementsFromClipboard(): Promise<ElementInput[] | null> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return null;
  }
  if (!text.startsWith(CLIPBOARD_MARKER)) return null;
  let parsed: ClipboardPayload;
  try {
    parsed = JSON.parse(text.slice(CLIPBOARD_MARKER.length));
  } catch {
    return null;
  }
  if (!parsed || parsed.marker !== CLIPBOARD_MARKER || !Array.isArray(parsed.elements)) {
    return null;
  }

  if (text === lastSignature) {
    pasteCount += 1;
  } else {
    lastSignature = text;
    pasteCount = 1;
  }
  const offset = PASTE_OFFSET * pasteCount;

  return parsed.elements.map((el) => {
    const { id: _id, ...rest } = el;
    void _id;
    return { ...rest, x: rest.x + offset, y: rest.y + offset } as ElementInput;
  });
}
