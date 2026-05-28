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

class DesignDB extends Dexie {
  projects!: EntityTable<Project, "id">;

  constructor() {
    super("dsgntool");
    this.version(1).stores({
      projects: "id, updatedAt",
    });
  }
}

export const db = new DesignDB();
