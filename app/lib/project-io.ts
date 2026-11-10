import type { EditorElement, CanvasFormat, GradientFill, Page } from "../types/editor";
import { CANVAS_FORMATS } from "../types/editor";
import { db } from "./db";
import { blobToDataUrl, collectAssetIds, dataUrlToBlob, saveAsset } from "./local-assets";

export const FILE_EXTENSION = "modo";
export const FILE_MIME = "application/json";
// v1 = single artboard (`elements`/`backgroundColor` at the top level).
// v2 = page stack.
// v3 = v2 + `assets`: the device-stored images the design uses, embedded as
//      data URLs so the file opens on another device. v1/v2 still import.
export const FILE_SCHEMA_VERSION = 3;

/** An embedded image, keyed by its asset id (elements say `asset:<id>`). */
export interface FileAsset {
  name: string;
  w: number;
  h: number;
  /** data:image/...;base64,... */
  data: string;
}

export interface ProjectFile {
  version: number;
  name: string;
  format: CanvasFormat;
  pages: Page[];
  assets?: Record<string, FileAsset>;
  exportedAt: string;
}

export interface ImportedProject {
  name: string;
  format: CanvasFormat;
  pages: Page[];
}

/** Embed every device-stored image these pages use. Missing ones are skipped. */
export async function embedAssets(pages: Page[]): Promise<Record<string, FileAsset>> {
  const out: Record<string, FileAsset> = {};
  for (const id of collectAssetIds(pages)) {
    const a = await db.assets.get(id).catch(() => undefined);
    if (!a) continue;
    out[id] = { name: a.name, w: a.w, h: a.h, data: await blobToDataUrl(a.blob) };
  }
  return out;
}

const DATA_IMAGE = /^data:image\/(png|jpeg|webp|gif);base64,/;

/** Store embedded images back on this device, keeping their ids. */
export async function restoreAssets(assets: unknown): Promise<void> {
  if (!assets || typeof assets !== "object") return;
  for (const [id, raw] of Object.entries(assets as Record<string, unknown>)) {
    const a = raw as Partial<FileAsset> | null;
    if (!a || typeof a.data !== "string" || !DATA_IMAGE.test(a.data)) continue;
    if (!/^[\w-]{1,64}$/.test(id)) continue;
    if (await db.assets.get(id).catch(() => undefined)) continue;
    await saveAsset(dataUrlToBlob(a.data), {
      id,
      name: typeof a.name === "string" ? a.name.slice(0, 200) : "image",
      w: typeof a.w === "number" ? a.w : 0,
      h: typeof a.h === "number" ? a.h : 0,
    });
  }
}

export async function serializeProject(p: {
  name: string;
  format: CanvasFormat;
  pages: Page[];
}): Promise<string> {
  const data: ProjectFile = {
    version: FILE_SCHEMA_VERSION,
    name: p.name,
    format: p.format,
    pages: p.pages,
    assets: await embedAssets(p.pages),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function downloadProjectFile(p: {
  name: string;
  format: CanvasFormat;
  pages: Page[];
}) {
  const json = await serializeProject(p);
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

export function validateFormat(f: unknown): CanvasFormat {
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

  const pages = validatePages(parsed as Record<string, unknown>);
  const format = validateFormat(data.format);
  await restoreAssets(data.assets);
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
export function validatePages(raw: Record<string, unknown>): Page[] {
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
