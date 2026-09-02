import Dexie, { type EntityTable } from "dexie";
import type { Project, ProjectInput, ProjectRepo } from "./project-repo";

// The browser implementation of ProjectRepo: IndexedDB via Dexie.
//
// The Dexie instance is private to this module — the editor, the autosave loop
// and the sync layer reach it only through ProjectRepo, which is what lets a
// desktop build put SQLite here instead. See project-repo.ts.

interface Setting {
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

// Constructed on first use rather than at import time. The desktop build
// imports this module (project-repo.ts references both implementations) but
// never calls into it, and a module-scope `new DesignDB()` would leave an empty,
// permanently unused IndexedDB database sitting in the Electron profile.
let instance: DesignDB | null = null;
function db(): DesignDB {
  return (instance ??= new DesignDB());
}

export const dexieProjectRepo: ProjectRepo = {
  get(id: string) {
    return db().projects.get(id);
  },

  list() {
    return db().projects.orderBy("updatedAt").reverse().toArray();
  },

  latest() {
    return db().projects.orderBy("updatedAt").reverse().first();
  },

  count() {
    return db().projects.count();
  },

  async save(input: ProjectInput) {
    const existing = await db().projects.get(input.id);
    const record: Project = {
      ...input,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    await db().projects.put(record);
    return record;
  },

  async put(project: Project) {
    await db().projects.put(project);
  },

  async delete(id: string) {
    await db().projects.delete(id);
  },

  async clear() {
    await db().projects.clear();
  },

  async getSetting<T>(key: string) {
    const row = await db().settings.get(key);
    return row?.value as T | undefined;
  },

  async setSetting(key: string, value: unknown) {
    await db().settings.put({ key, value });
  },

  async clearSettings() {
    await db().settings.clear();
  },
};
