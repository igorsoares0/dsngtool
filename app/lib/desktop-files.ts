import { desktopBridge, type ImageToSave } from "./desktop-bridge";
import { serializeProject, parseProjectJson, type ImportedProject } from "./project-io";
import type { CanvasFormat, Page } from "../types/editor";

// Desktop counterparts to the browser file paths in project-io.ts and
// export-modal.tsx. Same operations, native dialogs — see desktop/files.js.

/** Write rendered pages to disk. Resolves to how many the user actually saved. */
export async function saveImagesToDisk(items: ImageToSave[]): Promise<number> {
  const { saved } = await desktopBridge().files.saveImages(items);
  return saved;
}

/** "Save a Copy…" — write the document as a .modo file wherever the user picks. */
export async function saveProjectToDisk(p: {
  name: string;
  format: CanvasFormat;
  pages: Page[];
}): Promise<boolean> {
  const { saved } = await desktopBridge().files.saveProject(
    p.name || "design",
    serializeProject(p)
  );
  return saved;
}

/**
 * "Open Project…" — read a .modo file the user picks.
 *
 * Resolves to null when the dialog is dismissed, which is a normal outcome and
 * not an error. A malformed file still throws ImportError from parseProjectJson,
 * so the caller reports the same message the web import does.
 */
export async function openProjectFromDisk(): Promise<ImportedProject | null> {
  const file = await desktopBridge().files.openProject();
  if (!file) return null;
  const imported = parseProjectJson(file.text);
  return imported.name === "Imported" ? { ...imported, name: file.name } : imported;
}
