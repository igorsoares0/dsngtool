import Dexie, { type EntityTable } from "dexie";
import type { EditorElement, CanvasFormat, GradientFill } from "../types/editor";

export interface Project {
  id: string;
  name: string;
  elements: EditorElement[];
  backgroundColor: string;
  backgroundGradient?: GradientFill | null;
  format: CanvasFormat;
  createdAt: Date;
  updatedAt: Date;
}

// Generic key/value store for app-level settings (e.g. the cached license).
export interface Setting {
  key: string;
  value: unknown;
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
  }
}

export const db = new DesignDB();
