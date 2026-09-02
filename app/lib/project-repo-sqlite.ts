import type { Project, ProjectInput, ProjectRepo } from "./project-repo";
import { desktopBridge, type WireProject } from "./desktop-bridge";

// The desktop implementation of ProjectRepo: SQLite, reached over IPC.
//
// This file holds no persistence logic — the SQL lives in desktop/db.js, in the
// main process, because that is the only side with filesystem access. All this
// does is satisfy the interface and translate the wire format.
//
// It is compiled into the web bundle too (project-repo.ts imports both
// implementations and picks one), which is harmless: there are no dependencies
// here beyond types, and the branch that selects it is dead when
// NEXT_PUBLIC_DESKTOP is unset.

const bridge = () => desktopBridge().repo;

const fromWire = (p: WireProject): Project => ({
  ...p,
  createdAt: new Date(p.createdAt),
  updatedAt: new Date(p.updatedAt),
});

const toWire = (p: Project): WireProject => ({
  ...p,
  createdAt: new Date(p.createdAt).getTime(),
  updatedAt: new Date(p.updatedAt).getTime(),
});

export const sqliteProjectRepo: ProjectRepo = {
  async get(id: string) {
    const row = await bridge().get(id);
    return row ? fromWire(row) : undefined;
  },

  async list() {
    return (await bridge().list()).map(fromWire);
  },

  async latest() {
    const row = await bridge().latest();
    return row ? fromWire(row) : undefined;
  },

  count() {
    return bridge().count();
  },

  async save(input: ProjectInput) {
    // Sent field by field rather than spread: `input` comes from the Zustand
    // store, and structured clone rejects anything non-cloneable that might be
    // hanging off it.
    return fromWire(
      await bridge().save({
        id: input.id,
        name: input.name,
        pages: input.pages,
        format: input.format,
      })
    );
  },

  async put(project: Project) {
    await bridge().put(toWire(project));
  },

  async delete(id: string) {
    await bridge().delete(id);
  },

  async clear() {
    await bridge().clear();
  },

  getSetting<T>(key: string) {
    return bridge().getSetting<T>(key);
  },

  async setSetting(key: string, value: unknown) {
    await bridge().setSetting(key, value);
  },

  async clearSettings() {
    await bridge().clearSettings();
  },
};
