import type { EditorElement, CanvasFormat, GradientFill } from "../types/editor";
import { CANVAS_FORMATS } from "../types/editor";

export const FILE_EXTENSION = "modo";
export const FILE_MIME = "application/json";
export const FILE_SCHEMA_VERSION = 1;

export interface ProjectFile {
  version: number;
  name: string;
  format: CanvasFormat;
  backgroundColor: string;
  backgroundGradient?: GradientFill | null;
  elements: EditorElement[];
  exportedAt: string;
}

export interface ImportedProject {
  name: string;
  format: CanvasFormat;
  backgroundColor: string;
  backgroundGradient: GradientFill | null;
  elements: EditorElement[];
}

export function serializeProject(p: {
  name: string;
  format: CanvasFormat;
  backgroundColor: string;
  backgroundGradient?: GradientFill | null;
  elements: EditorElement[];
}): string {
  const data: ProjectFile = {
    version: FILE_SCHEMA_VERSION,
    name: p.name,
    format: p.format,
    backgroundColor: p.backgroundColor,
    backgroundGradient: p.backgroundGradient ?? null,
    elements: p.elements,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadProjectFile(p: {
  name: string;
  format: CanvasFormat;
  backgroundColor: string;
  backgroundGradient?: GradientFill | null;
  elements: EditorElement[];
}) {
  const json = serializeProject(p);
  const blob = new Blob([json], { type: FILE_MIME });
  const url = URL.createObjectURL(blob);
  const safeName = (p.name || "design").replace(/[^a-zA-Z0-9-_]/g, "_");
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName}.${FILE_EXTENSION}`;
  a.click();
  URL.revokeObjectURL(url);
}

class ImportError extends Error {}

function validateFormat(f: unknown): CanvasFormat {
  if (
    !f ||
    typeof f !== "object" ||
    typeof (f as CanvasFormat).label !== "string" ||
    typeof (f as CanvasFormat).width !== "number" ||
    typeof (f as CanvasFormat).height !== "number"
  ) {
    throw new ImportError("Invalid format field");
  }
  return f as CanvasFormat;
}

function validateElement(el: unknown, idx: number): EditorElement {
  if (!el || typeof el !== "object") {
    throw new ImportError(`Element ${idx} is not an object`);
  }
  const e = el as Record<string, unknown>;
  if (typeof e.id !== "string") throw new ImportError(`Element ${idx} missing id`);
  if (e.type !== "text" && e.type !== "image" && e.type !== "shape") {
    throw new ImportError(`Element ${idx} has invalid type`);
  }
  const numFields = ["x", "y", "width", "height", "rotation", "opacity"];
  for (const f of numFields) {
    if (typeof e[f] !== "number") throw new ImportError(`Element ${idx} missing ${f}`);
  }
  return el as EditorElement;
}

export async function readProjectFile(file: File): Promise<ImportedProject> {
  let text: string;
  try {
    text = await file.text();
  } catch {
    throw new ImportError("Could not read file");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError("File is not valid JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new ImportError("File is empty or malformed");
  }

  const data = parsed as Partial<ProjectFile>;

  if (typeof data.version !== "number") {
    throw new ImportError("Missing version field");
  }
  if (data.version > FILE_SCHEMA_VERSION) {
    throw new ImportError(
      `File version ${data.version} is newer than supported (${FILE_SCHEMA_VERSION})`
    );
  }

  if (!Array.isArray(data.elements)) {
    throw new ImportError("Missing elements array");
  }

  const elements = data.elements.map((el, i) => validateElement(el, i));
  const format = validateFormat(data.format);
  const backgroundColor =
    typeof data.backgroundColor === "string" ? data.backgroundColor : "#ffffff";
  const backgroundGradient = validateGradient(data.backgroundGradient);
  const name = typeof data.name === "string" && data.name.trim() ? data.name : "Imported";

  const matchedFormat =
    CANVAS_FORMATS.find((f) => f.width === format.width && f.height === format.height) ?? format;

  return { name, format: matchedFormat, backgroundColor, backgroundGradient, elements };
}

function validateGradient(g: unknown): GradientFill | null {
  if (!g || typeof g !== "object") return null;
  const obj = g as Record<string, unknown>;
  if (obj.type !== "linear" && obj.type !== "radial") return null;
  const numFields = ["startX", "startY", "endX", "endY"];
  for (const f of numFields) {
    if (typeof obj[f] !== "number") return null;
  }
  if (!Array.isArray(obj.colorStops)) return null;
  return obj as unknown as GradientFill;
}

export { ImportError };
