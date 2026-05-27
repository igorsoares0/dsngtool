import { create } from "zustand";
import type {
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
  CanvasFormat,
} from "../types/editor";
import { CANVAS_FORMATS } from "../types/editor";

let idCounter = 0;
function genId() {
  return `el_${++idCounter}_${Date.now()}`;
}

interface HistorySnapshot {
  elements: EditorElement[];
  backgroundColor: string;
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  format: CanvasFormat;
  zoom: number;
  backgroundColor: string;

  // history
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // actions
  addElement: (el: Omit<TextElement, "id"> | Omit<ImageElement, "id"> | Omit<ShapeElement, "id">) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  removeElement: (id: string) => void;
  selectElement: (id: string | null) => void;
  setFormat: (format: CanvasFormat) => void;
  setZoom: (zoom: number) => void;
  setBackgroundColor: (color: string) => void;
  moveElement: (id: string, direction: "up" | "down") => void;
  duplicateElement: (id: string) => void;
  loadTemplate: (template: { elements: (Omit<TextElement, "id"> | Omit<ImageElement, "id"> | Omit<ShapeElement, "id">)[]; backgroundColor: string; format?: CanvasFormat }) => void;

  undo: () => void;
  redo: () => void;
}

function pushHistory(state: EditorState): Pick<EditorState, "past" | "future"> {
  return {
    past: [...state.past.slice(-49), { elements: state.elements, backgroundColor: state.backgroundColor }],
    future: [],
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  elements: [],
  selectedId: null,
  format: CANVAS_FORMATS[0],
  zoom: 100,
  backgroundColor: "#ffffff",

  past: [],
  future: [],

  addElement: (elData) => {
    const id = genId();
    const el = { ...elData, id } as EditorElement;
    set((s) => ({
      ...pushHistory(s),
      elements: [...s.elements, el],
      selectedId: id,
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

  removeElement: (id) => {
    set((s) => ({
      ...pushHistory(s),
      elements: s.elements.filter((el) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  selectElement: (id) => set({ selectedId: id }),

  setFormat: (format) => set({ format }),

  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(400, zoom)) }),

  setBackgroundColor: (color) => {
    set((s) => ({
      ...pushHistory(s),
      backgroundColor: color,
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
      format: template.format || s.format,
      selectedId: null,
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

  duplicateElement: (id) => {
    const s = get();
    const el = s.elements.find((e) => e.id === id);
    if (!el) return;
    const newId = genId();
    const dup = { ...el, id: newId, x: el.x + 20, y: el.y + 20 };
    set((s) => ({
      ...pushHistory(s),
      elements: [...s.elements, dup],
      selectedId: newId,
    }));
  },

  undo: () => {
    set((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        future: [{ elements: s.elements, backgroundColor: s.backgroundColor }, ...s.future.slice(0, 49)],
        elements: prev.elements,
        backgroundColor: prev.backgroundColor,
        selectedId: null,
      };
    });
  },

  redo: () => {
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, { elements: s.elements, backgroundColor: s.backgroundColor }],
        future: s.future.slice(1),
        elements: next.elements,
        backgroundColor: next.backgroundColor,
        selectedId: null,
      };
    });
  },
}));
