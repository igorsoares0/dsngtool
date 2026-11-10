/** A saved design as the dashboard lists it (read from IndexedDB). */
export interface ProjectRow {
  id: string;
  name: string;
  // The whole stored document — it is what lets the cards draw a real preview
  // without a stored image.
  data: {
    format?: { name?: string; label?: string; width?: number; height?: number };
    pages?: unknown;
    elements?: unknown;
    backgroundColor?: string;
    backgroundGradient?: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export type Nav = "projects" | "settings";
