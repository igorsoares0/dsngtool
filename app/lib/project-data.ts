import type { Page, EditorElement, GradientFill } from "../types/editor";

/**
 * A project used to be a single artboard: `{ elements, backgroundColor,
 * backgroundGradient, format }`. It is now a stack of pages. Both shapes are
 * still read — from IndexedDB, from the server's `data` JSON, and from `.modo`
 * files — so nothing saved before the change becomes unreadable.
 *
 * Writes always emit the new shape; the legacy fields are never written back.
 */
export interface LegacyPageFields {
  elements?: EditorElement[];
  backgroundColor?: string;
  backgroundGradient?: GradientFill | null;
}

export interface PagedFields {
  pages?: unknown;
}

let migratedCounter = 0;

function isPage(v: unknown): v is Page {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return typeof p.id === "string" && Array.isArray(p.elements);
}

/**
 * Coerce either storage shape into a page stack. Always returns at least one
 * page — an empty or malformed record opens as a blank artboard rather than
 * throwing the user back to a broken editor.
 */
export function normalizePages(data: (LegacyPageFields & PagedFields) | null | undefined): Page[] {
  const pages = data?.pages;
  if (Array.isArray(pages)) {
    const valid = pages.filter(isPage).map((p) => ({
      id: p.id,
      elements: p.elements ?? [],
      backgroundColor: p.backgroundColor ?? "#ffffff",
      backgroundGradient: p.backgroundGradient ?? null,
    }));
    if (valid.length > 0) return valid;
  }
  return [
    {
      id: `pg_migrated_${++migratedCounter}_${Date.now()}`,
      elements: data?.elements ?? [],
      backgroundColor: data?.backgroundColor ?? "#ffffff",
      backgroundGradient: data?.backgroundGradient ?? null,
    },
  ];
}

/** Total element count across the stack — used for size/empty checks. */
export function countElements(pages: Page[]): number {
  return pages.reduce((n, p) => n + p.elements.length, 0);
}
