import { create } from "zustand";
import type {
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
  CanvasFormat,
  GradientFill,
} from "../types/editor";
import { CANVAS_FORMATS } from "../types/editor";

let idCounter = 0;
function genId() {
  return `el_${++idCounter}_${Date.now()}`;
}

interface HistorySnapshot {
  elements: EditorElement[];
  backgroundColor: string;
  backgroundGradient: GradientFill | null;
}

interface EditorState {
  projectId: string;
  projectName: string;
  elements: EditorElement[];
  selectedIds: string[];
  format: CanvasFormat;
  zoom: number;
  backgroundColor: string;
  backgroundGradient: GradientFill | null;
  lastSavedAt: number | null;

  // history
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // actions
  setProjectName: (name: string) => void;
  addElement: (el: Omit<TextElement, "id"> | Omit<ImageElement, "id"> | Omit<ShapeElement, "id">) => void;
  addMultipleElements: (els: (Omit<TextElement, "id"> | Omit<ImageElement, "id"> | Omit<ShapeElement, "id">)[]) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  updateMultipleElements: (updates: Map<string, Partial<EditorElement>>) => void;
  removeElement: (id: string) => void;
  removeSelectedElements: () => void;
  selectElement: (id: string | null, addToSelection?: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  selectAll: () => void;
  setFormat: (format: CanvasFormat) => void;
  setZoom: (zoom: number) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundGradient: (gradient: GradientFill | null) => void;
  moveElement: (id: string, direction: "up" | "down") => void;
  reorderElements: (fromIndex: number, toIndex: number) => void;
  duplicateElement: (id: string) => void;
  duplicateSelectedElements: () => void;
  loadTemplate: (template: { elements: (Omit<TextElement, "id"> | Omit<ImageElement, "id"> | Omit<ShapeElement, "id">)[]; backgroundColor: string; backgroundGradient?: GradientFill | null; format?: CanvasFormat }) => void;
  loadProject: (project: { id: string; name: string; elements: EditorElement[]; backgroundColor: string; backgroundGradient?: GradientFill | null; format: CanvasFormat }) => void;
  newProject: () => void;
  markSaved: () => void;

  undo: () => void;
  redo: () => void;
}

function pushHistory(state: EditorState): Pick<EditorState, "past" | "future"> {
  return {
    past: [
      ...state.past.slice(-49),
      {
        elements: state.elements,
        backgroundColor: state.backgroundColor,
        backgroundGradient: state.backgroundGradient,
      },
    ],
    future: [],
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: `proj_${Date.now()}`,
  projectName: "Untitled",
  elements: [],
  selectedIds: [],
  format: CANVAS_FORMATS[0],
  zoom: 100,
  backgroundColor: "#ffffff",
  backgroundGradient: null,
  lastSavedAt: null,

  past: [],
  future: [],

  setProjectName: (name) => set({ projectName: name }),

  addElement: (elData) => {
    const id = genId();
    const el = { ...elData, id } as EditorElement;
    set((s) => ({
      ...pushHistory(s),
      elements: [...s.elements, el],
      selectedIds: [id],
    }));
  },

  addMultipleElements: (elsData) => {
    if (elsData.length === 0) return;
    const newEls: EditorElement[] = [];
    const newIds: string[] = [];
    for (const d of elsData) {
      const id = genId();
      newEls.push({ ...d, id } as EditorElement);
      newIds.push(id);
    }
    set((s) => ({
      ...pushHistory(s),
      elements: [...s.elements, ...newEls],
      selectedIds: newIds,
    }));
  },

  updateElement: (id, updates) => {
    set((s) => ({
      ...pushHistory(s),
      elements: s.elements.map((el) =>
        el.id === id ? ({ ...el, ...updates } as EditorElement) : el
      ),
    }));
  },

  updateMultipleElements: (updates) => {
    set((s) => ({
      ...pushHistory(s),
      elements: s.elements.map((el) => {
        const u = updates.get(el.id);
        return u ? ({ ...el, ...u } as EditorElement) : el;
      }),
    }));
  },

  removeElement: (id) => {
    set((s) => ({
      ...pushHistory(s),
      elements: s.elements.filter((el) => el.id !== id),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
    }));
  },

  removeSelectedElements: () => {
    set((s) => {
      if (s.selectedIds.length === 0) return s;
      const idSet = new Set(s.selectedIds);
      return {
        ...pushHistory(s),
        elements: s.elements.filter((el) => !idSet.has(el.id)),
        selectedIds: [],
      };
    });
  },

  selectElement: (id, addToSelection) => {
    if (id === null) {
      set({ selectedIds: [] });
      return;
    }
    if (addToSelection) {
      set((s) => ({
        selectedIds: s.selectedIds.includes(id)
          ? s.selectedIds.filter((sid) => sid !== id)
          : [...s.selectedIds, id],
      }));
    } else {
      set({ selectedIds: [id] });
    }
  },

  setSelectedIds: (ids) => {
    set({ selectedIds: ids });
  },

  selectAll: () => {
    set((s) => ({ selectedIds: s.elements.map((el) => el.id) }));
  },

  setFormat: (format) => set({ format }),

  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(400, zoom)) }),

  setBackgroundColor: (color) => {
    set((s) => ({
      ...pushHistory(s),
      backgroundColor: color,
      backgroundGradient: null,
    }));
  },

  setBackgroundGradient: (gradient) => {
    set((s) => ({
      ...pushHistory(s),
      backgroundGradient: gradient,
    }));
  },

  loadTemplate: (template) => {
    const newElements = template.elements.map((elData) => {
      const id = genId();
      return { ...elData, id } as EditorElement;
    });
    set((s) => ({
      ...pushHistory(s),
      elements: newElements,
      backgroundColor: template.backgroundColor,
      backgroundGradient: template.backgroundGradient ?? null,
      format: template.format || s.format,
      selectedIds: [],
    }));
  },

  moveElement: (id, direction) => {
    set((s) => {
      const idx = s.elements.findIndex((el) => el.id === id);
      if (idx === -1) return s;
      const newElements = [...s.elements];
      const swapIdx = direction === "up" ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= newElements.length) return s;
      [newElements[idx], newElements[swapIdx]] = [newElements[swapIdx], newElements[idx]];
      return { ...pushHistory(s), elements: newElements };
    });
  },

  reorderElements: (fromIndex, toIndex) => {
    set((s) => {
      if (fromIndex === toIndex) return s;
      const newElements = [...s.elements];
      const [moved] = newElements.splice(fromIndex, 1);
      newElements.splice(toIndex, 0, moved);
      return { ...pushHistory(s), elements: newElements };
    });
  },

  duplicateElement: (id) => {
    const s = get();
    const el = s.elements.find((e) => e.id === id);
    if (!el) return;
    const newId = genId();
    const dup = { ...el, id: newId, x: el.x + 20, y: el.y + 20 };
    set((s) => ({
      ...pushHistory(s),
      elements: [...s.elements, dup],
      selectedIds: [newId],
    }));
  },

  duplicateSelectedElements: () => {
    const s = get();
    if (s.selectedIds.length === 0) return;
    const idSet = new Set(s.selectedIds);
    const toDup = s.elements.filter((el) => idSet.has(el.id));
    const newEls: EditorElement[] = [];
    const newIds: string[] = [];
    for (const el of toDup) {
      const newId = genId();
      newEls.push({ ...el, id: newId, x: el.x + 20, y: el.y + 20 });
      newIds.push(newId);
    }
    set((s) => ({
      ...pushHistory(s),
      elements: [...s.elements, ...newEls],
      selectedIds: newIds,
    }));
  },

  loadProject: (project) => {
    set({
      projectId: project.id,
      projectName: project.name,
      elements: project.elements,
      backgroundColor: project.backgroundColor,
      backgroundGradient: project.backgroundGradient ?? null,
      format: project.format,
      selectedIds: [],
      past: [],
      future: [],
    });
  },

  newProject: () => {
    set({
      projectId: `proj_${Date.now()}`,
      projectName: "Untitled",
      elements: [],
      selectedIds: [],
      format: CANVAS_FORMATS[0],
      zoom: 100,
      backgroundColor: "#ffffff",
      backgroundGradient: null,
      lastSavedAt: null,
      past: [],
      future: [],
    });
  },

  markSaved: () => set({ lastSavedAt: Date.now() }),

  undo: () => {
    set((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [
          {
            elements: s.elements,
            backgroundColor: s.backgroundColor,
            backgroundGradient: s.backgroundGradient,
          },
          ...s.future.slice(0, 49),
        ],
        elements: prev.elements,
        backgroundColor: prev.backgroundColor,
        backgroundGradient: prev.backgroundGradient,
        selectedIds: [],
      };
    });
  },

  redo: () => {
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [
          ...s.past,
          {
            elements: s.elements,
            backgroundColor: s.backgroundColor,
            backgroundGradient: s.backgroundGradient,
          },
        ],
        future: s.future.slice(1),
        elements: next.elements,
        backgroundColor: next.backgroundColor,
        backgroundGradient: next.backgroundGradient,
        selectedIds: [],
      };
    });
  },
}));
