import Dexie, { type EntityTable } from "dexie";
import type { CanvasFormat, Page } from "../types/editor";

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  format: CanvasFormat;
  createdAt: Date;
  updatedAt: Date;
  /** Local-only: set when a server push is pending (offline/failed). Not indexed. */
  dirty?: boolean;
}

// Generic key/value store for app-level settings (e.g. the cached license).
export interface Setting {
  key: string;
  value: unknown;
}

/** The pre-pages record shape, as it still exists in browsers upgrading from v2. */
interface LegacyProjectRow {
  id: string;
  elements?: unknown[];
  backgroundColor?: string;
  backgroundGradient?: unknown;
  pages?: unknown[];
}

class DesignDB extends Dexie {
  projects!: EntityTable<Project, "id">;
  settings!: EntityTable<Setting, "key">;

  constructor() {
    super("dsgntool");
    this.version(1).stores({
      projects: "id, updatedAt",
    });
    this.version(2).stores({
      projects: "id, updatedAt",
      settings: "key",
    });
    // v3 turned the single artboard into a stack of pages. The indexes are
    // unchanged — this version exists only to rewrite existing rows, which
    // Dexie runs once per browser. Without it every locally-cached project
    // would open blank, since `pages` would be undefined.
    this.version(3)
      .stores({
        projects: "id, updatedAt",
        settings: "key",
      })
      .upgrade(async (tx) => {
        await tx
          .table("projects")
          .toCollection()
          .modify((p: LegacyProjectRow) => {
            if (Array.isArray(p.pages)) return;
            p.pages = [
              {
                id: `pg_legacy_${p.id}`,
                elements: p.elements ?? [],
                backgroundColor: p.backgroundColor ?? "#ffffff",
                backgroundGradient: p.backgroundGradient ?? null,
              },
            ];
            delete p.elements;
            delete p.backgroundColor;
            delete p.backgroundGradient;
          });
      });
  }
}

export const db = new DesignDB();
