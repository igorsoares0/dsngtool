import Dexie, { type EntityTable } from "dexie";
import type { CanvasFormat, Page } from "../types/editor";

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  format: CanvasFormat;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * An image the user added. Elements reference it as `asset:<id>` (see
 * app/lib/local-assets.ts), so the bytes are stored once however many designs
 * use them, and stay out of the project rows that autosave rewrites.
 */
export interface LocalAsset {
  id: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  /** Natural pixel dimensions. */
  w: number;
  h: number;
  createdAt: Date;
}

// Generic key/value store for app-level settings (license, AI key).
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
  assets!: EntityTable<LocalAsset, "id">;

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
    // v4: uploaded images live on the device (they used to go to R2).
    this.version(4).stores({
      projects: "id, updatedAt",
      settings: "key",
      assets: "id, createdAt",
    });
  }
}

export const db = new DesignDB();
