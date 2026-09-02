import type { EditorElement, CanvasFormat, GradientFill, Page } from "../types/editor";
import { CANVAS_FORMATS } from "../types/editor";

export const FILE_EXTENSION = "modo";
export const FILE_MIME = "application/json";
// v1 = single artboard (`elements`/`backgroundColor` at the top level).
// v2 = page stack. v1 files still import; exports are always v2.
export const FILE_SCHEMA_VERSION = 2;

export interface ProjectFile {
  version: number;
  name: string;
  format: CanvasFormat;
  pages: Page[];
  exportedAt: string;
}

export interface ImportedProject {
  name: string;
  format: CanvasFormat;
  pages: Page[];
}

export function serializeProject(p: {
  name: string;
  format: CanvasFormat;
  pages: Page[];
}): string {
  const data: ProjectFile = {
    version: FILE_SCHEMA_VERSION,
    name: p.name,
    format: p.format,
    pages: p.pages,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function downloadProjectFile(p: {
  name: string;
  format: CanvasFormat;
  pages: Page[];
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
  return parseProjectJson(text);
}

/**
 * Validate and normalise the contents of a project file.
 *
 * Split out from readProjectFile so a caller that already has the text can
 * reuse it — the desktop build reads the file in the main process, through a
 * native dialog, and never has a `File` object to hand.
 */
export function parseProjectJson(text: string): ImportedProject {
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

  const pages = validatePages(parsed as Record<string, unknown>);
  const format = validateFormat(data.format);
  const name = typeof data.name === "string" && data.name.trim() ? data.name : "Imported";

  const matchedFormat =
    CANVAS_FORMATS.find((f) => f.width === format.width && f.height === format.height) ?? format;

  return { name, format: matchedFormat, pages };
}

let importedPageCounter = 0;

/**
 * Read the page stack out of either schema. v2 carries `pages`; a v1 file has
 * its single artboard spread across the top level, which becomes page one.
 * Page ids are minted fresh on import (the file's own are meaningless here);
 * element ids are kept as the file wrote them, as they always have been.
 */
function validatePages(raw: Record<string, unknown>): Page[] {
  const rawPages = raw.pages;
  if (Array.isArray(rawPages)) {
    if (rawPages.length === 0) throw new ImportError("File has no pages");
    return rawPages.map((p, pi) => {
      if (!p || typeof p !== "object") throw new ImportError(`Page ${pi + 1} is not an object`);
      const page = p as Record<string, unknown>;
      if (!Array.isArray(page.elements)) {
        throw new ImportError(`Page ${pi + 1} is missing its elements array`);
      }
      return {
        id: `pg_import_${++importedPageCounter}_${Date.now()}`,
        elements: page.elements.map((el, i) => validateElement(el, i)),
        backgroundColor:
          typeof page.backgroundColor === "string" ? page.backgroundColor : "#ffffff",
        backgroundGradient: validateGradient(page.backgroundGradient),
      };
    });
  }

  if (!Array.isArray(raw.elements)) {
    throw new ImportError("Missing pages array");
  }
  return [
    {
      id: `pg_import_${++importedPageCounter}_${Date.now()}`,
      elements: raw.elements.map((el, i) => validateElement(el, i)),
      backgroundColor:
        typeof raw.backgroundColor === "string" ? raw.backgroundColor : "#ffffff",
      backgroundGradient: validateGradient(raw.backgroundGradient),
    },
  ];
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
