import type { Page, EditorElement, GradientFill } from "../types/editor";

/**
 * A project used to be a single artboard: `{ elements, backgroundColor,
 * backgroundGradient, format }`. It is now a stack of pages. Both shapes are
 * still read — from IndexedDB, from the server's `data` JSON, and from `.modo`
 * files — so nothing saved before the change becomes unreadable.
 *
 * Writes always emit the new shape; the legacy fields are never written back.
 */
let migratedCounter = 0;

function isPage(v: unknown): v is Page {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return typeof p.id === "string" && Array.isArray(p.elements);
}

/**
 * Coerce either storage shape into a page stack. Takes `unknown` on purpose:
 * the input is a JSON column from the server or a row from IndexedDB, neither
 * of which is typechecked at the boundary. Always returns at least one page —
 * an empty or malformed record opens as a blank artboard rather than throwing
 * the user back to a broken editor.
 */
export function normalizePages(data: unknown): Page[] {
  const record = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;

  if (Array.isArray(record.pages)) {
    const valid = record.pages.filter(isPage).map((p) => ({
      id: p.id,
      elements: p.elements ?? [],
      backgroundColor:
        typeof p.backgroundColor === "string" ? p.backgroundColor : "#ffffff",
      backgroundGradient: (p.backgroundGradient ?? null) as GradientFill | null,
    }));
    if (valid.length > 0) return valid;
  }

  return [
    {
      id: `pg_migrated_${++migratedCounter}_${Date.now()}`,
      elements: Array.isArray(record.elements) ? (record.elements as EditorElement[]) : [],
      backgroundColor:
        typeof record.backgroundColor === "string" ? record.backgroundColor : "#ffffff",
      backgroundGradient: (record.backgroundGradient ?? null) as GradientFill | null,
    },
  ];
}

/** Total element count across the stack — used for size/empty checks. */
export function countElements(pages: Page[]): number {
  return pages.reduce((n, p) => n + p.elements.length, 0);
}
