import { create } from "zustand";
import type {
  EditorElement,
  TextElement,
  ImageElement,
  ShapeElement,
  CanvasFormat,
  GradientFill,
  Page,
} from "../types/editor";
import { CANVAS_FORMATS, MAX_PAGES } from "../types/editor";

let idCounter = 0;
function genId() {
  return `el_${++idCounter}_${Date.now()}`;
}

let pageCounter = 0;
function genPageId() {
  return `pg_${++pageCounter}_${Date.now()}`;
}

export function makePage(init?: Partial<Omit<Page, "id">>): Page {
  return {
    id: genPageId(),
    elements: init?.elements ?? [],
    backgroundColor: init?.backgroundColor ?? "#ffffff",
    backgroundGradient: init?.backgroundGradient ?? null,
  };
}

type NewElement =
  | Omit<TextElement, "id">
  | Omit<ImageElement, "id">
  | Omit<ShapeElement, "id">;

// A history entry captures the whole stack. That sounds expensive and isn't:
// an edit rebuilds only the touched page's array, so every other page is
// carried by reference. Snapshotting per-page instead would make undo behave
// differently depending on which artboard you were looking at.
interface HistorySnapshot {
  pages: Page[];
  activePageId: string;
}

interface EditorState {
  projectId: string;
  projectName: string;
  pages: Page[];
  activePageId: string;

  // Mirrors of the active page. The canvas renders from `pages`, but every
  // panel, toolbar and hook in the editor reads these — keeping them in sync on
  // each mutation is what lets the rest of the app stay page-unaware.
  elements: EditorElement[];
  backgroundColor: string;
  backgroundGradient: GradientFill | null;

  selectedIds: string[];
  format: CanvasFormat;
  zoom: number;
  panX: number;
  panY: number;
  activeTool: "cursor" | "hand";
  spaceHeld: boolean;
  lastSavedAt: number | null;
  clipboard: EditorElement[] | null;

  // history
  past: HistorySnapshot[];
  future: HistorySnapshot[];

  // actions
  setProjectName: (name: string) => void;
  addElement: (el: NewElement) => void;
  addMultipleElements: (els: NewElement[]) => void;
  updateElement: (id: string, updates: Partial<EditorElement>) => void;
  updateElementSilent: (id: string, updates: Partial<EditorElement>) => void;
  updateMultipleElements: (updates: Map<string, Partial<EditorElement>>) => void;
  removeElement: (id: string) => void;
  removeSelectedElements: () => void;
  selectElement: (id: string | null, addToSelection?: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  selectAll: () => void;
  setFormat: (format: CanvasFormat) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetPan: () => void;
  setActiveTool: (tool: "cursor" | "hand") => void;
  setSpaceHeld: (held: boolean) => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundGradient: (gradient: GradientFill | null) => void;
  moveElement: (id: string, direction: "up" | "down") => void;
  reorderElements: (fromIndex: number, toIndex: number) => void;
  duplicateElement: (id: string) => void;
  duplicateSelectedElements: () => void;
  copySelection: () => void;
  pasteClipboard: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  loadTemplate: (template: {
    elements: NewElement[];
    backgroundColor: string;
    backgroundGradient?: GradientFill | null;
    format?: CanvasFormat;
  }) => void;
  loadProject: (project: {
    id: string;
    name: string;
    pages: Page[];
    format: CanvasFormat;
  }) => void;
  newProject: () => void;
  markSaved: () => void;

  // pages
  setActivePage: (id: string) => void;
  addPage: (afterId?: string) => void;
  duplicatePage: (id: string) => void;
  removePage: (id: string) => void;
  movePage: (id: string, direction: "up" | "down") => void;

  undo: () => void;
  redo: () => void;
}

/** The active page's content, shaped as the mirror fields. */
function mirrorOf(pages: Page[], activePageId: string) {
  const page = pages.find((p) => p.id === activePageId) ?? pages[0];
  return {
    elements: page.elements,
    backgroundColor: page.backgroundColor,
    backgroundGradient: page.backgroundGradient,
  };
}

/** New page array with `fn` applied to the page holding `elId`. */
function mapPageOfElement(pages: Page[], elId: string, fn: (p: Page) => Page): Page[] {
  const idx = pages.findIndex((p) => p.elements.some((e) => e.id === elId));
  if (idx === -1) return pages;
  const next = [...pages];
  next[idx] = fn(next[idx]);
  return next;
}

/** New page array with `fn` applied to the active page. */
function mapActivePage(pages: Page[], activePageId: string, fn: (p: Page) => Page): Page[] {
  const idx = pages.findIndex((p) => p.id === activePageId);
  if (idx === -1) return pages;
  const next = [...pages];
  next[idx] = fn(next[idx]);
  return next;
}

/** Id of the page holding `elId`, or null. */
export function pageIdOfElement(pages: Page[], elId: string): string | null {
  return pages.find((p) => p.elements.some((e) => e.id === elId))?.id ?? null;
}

function pushHistory(state: EditorState): Pick<EditorState, "past" | "future"> {
  return {
    past: [
      ...state.past.slice(-49),
      { pages: state.pages, activePageId: state.activePageId },
    ],
    future: [],
  };
}

// Rapid, consecutive edits to the same field (slider drags, drag-to-scrub,
// fast typing) collapse into a single undo step instead of flooding history.
const COALESCE_MS = 500;
let lastEditAt = 0;
let lastEditKey = "";

function shouldCoalesce(key: string): boolean {
  const now = Date.now();
  const coalesce = now - lastEditAt < COALESCE_MS && lastEditKey === key;
  lastEditAt = now;
  lastEditKey = key;
  return coalesce;
}

const initialPage = makePage();

export const useEditorStore = create<EditorState>((set, get) => ({
  projectId: `proj_${Date.now()}`,
  projectName: "Untitled",
  pages: [initialPage],
  activePageId: initialPage.id,

  elements: initialPage.elements,
  backgroundColor: initialPage.backgroundColor,
  backgroundGradient: initialPage.backgroundGradient,

  selectedIds: [],
  format: CANVAS_FORMATS[0],
  zoom: 100,
  panX: 0,
  panY: 0,
  activeTool: "cursor",
  spaceHeld: false,
  lastSavedAt: null,
  clipboard: null,

  past: [],
  future: [],

  setProjectName: (name) => set({ projectName: name }),

  addElement: (elData) => {
    const id = genId();
    const el = { ...elData, id } as EditorElement;
    set((s) => {
      const pages = mapActivePage(s.pages, s.activePageId, (p) => ({
        ...p,
        elements: [...p.elements, el],
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        selectedIds: [id],
      };
    });
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
    set((s) => {
      const pages = mapActivePage(s.pages, s.activePageId, (p) => ({
        ...p,
        elements: [...p.elements, ...newEls],
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        selectedIds: newIds,
      };
    });
  },

  // Element mutations resolve the owning page from the element id rather than
  // assuming the active one. Selection happens on click, which Konva fires
  // *after* a drag completes — so a drag starting on an inactive page would
  // otherwise write its new position into whichever page was active.
  updateElement: (id, updates) => {
    set((s) => {
      const key = `one:${id}:${Object.keys(updates).sort().join(",")}`;
      const history = shouldCoalesce(key) ? {} : pushHistory(s);
      const pages = mapPageOfElement(s.pages, id, (p) => ({
        ...p,
        elements: p.elements.map((el) =>
          el.id === id ? ({ ...el, ...updates } as EditorElement) : el
        ),
      }));
      return { ...history, pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  // Layout sync (e.g. text auto-width) — never touches history.
  updateElementSilent: (id, updates) => {
    set((s) => {
      const pages = mapPageOfElement(s.pages, id, (p) => ({
        ...p,
        elements: p.elements.map((el) =>
          el.id === id ? ({ ...el, ...updates } as EditorElement) : el
        ),
      }));
      return { pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  updateMultipleElements: (updates) => {
    set((s) => {
      const ids = [...updates.keys()].sort().join("|");
      const fields = new Set<string>();
      for (const u of updates.values()) for (const k of Object.keys(u)) fields.add(k);
      const key = `many:${ids}:${[...fields].sort().join(",")}`;
      const history = shouldCoalesce(key) ? {} : pushHistory(s);
      // A multi-select never spans pages, so one page absorbs the whole batch.
      const firstId = [...updates.keys()][0];
      const pages = mapPageOfElement(s.pages, firstId, (p) => ({
        ...p,
        elements: p.elements.map((el) => {
          const u = updates.get(el.id);
          return u ? ({ ...el, ...u } as EditorElement) : el;
        }),
      }));
      return { ...history, pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  removeElement: (id) => {
    set((s) => {
      const pages = mapPageOfElement(s.pages, id, (p) => ({
        ...p,
        elements: p.elements.filter((el) => el.id !== id),
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        selectedIds: s.selectedIds.filter((sid) => sid !== id),
      };
    });
  },

  removeSelectedElements: () => {
    set((s) => {
      if (s.selectedIds.length === 0) return s;
      const idSet = new Set(s.selectedIds);
      const pages = mapPageOfElement(s.pages, s.selectedIds[0], (p) => ({
        ...p,
        elements: p.elements.filter((el) => !idSet.has(el.id)),
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        selectedIds: [],
      };
    });
  },

  // Selecting is what makes a page active, and a selection never spans two
  // pages: shift-clicking onto another artboard starts a fresh selection there
  // rather than building a group nothing downstream could act on coherently.
  selectElement: (id, addToSelection) => {
    if (id === null) {
      set({ selectedIds: [] });
      return;
    }
    set((s) => {
      const pageId = pageIdOfElement(s.pages, id) ?? s.activePageId;
      const pageChanged = pageId !== s.activePageId;
      const patch = pageChanged
        ? { activePageId: pageId, ...mirrorOf(s.pages, pageId) }
        : {};

      if (addToSelection && !pageChanged) {
        return {
          ...patch,
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((sid) => sid !== id)
            : [...s.selectedIds, id],
        };
      }
      return { ...patch, selectedIds: [id] };
    });
  },

  setSelectedIds: (ids) => {
    set((s) => {
      if (ids.length === 0) return { selectedIds: [] };
      const pageId = pageIdOfElement(s.pages, ids[0]) ?? s.activePageId;
      const patch =
        pageId !== s.activePageId
          ? { activePageId: pageId, ...mirrorOf(s.pages, pageId) }
          : {};
      return { ...patch, selectedIds: ids };
    });
  },

  selectAll: () => {
    set((s) => ({ selectedIds: s.elements.map((el) => el.id) }));
  },

  setFormat: (format) => set({ format }),

  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(400, zoom)) }),

  setPan: (x, y) => set({ panX: x, panY: y }),

  resetPan: () => set({ panX: 0, panY: 0 }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setSpaceHeld: (held) => set({ spaceHeld: held }),

  setBackgroundColor: (color) => {
    set((s) => {
      const pages = mapActivePage(s.pages, s.activePageId, (p) => ({
        ...p,
        backgroundColor: color,
        backgroundGradient: null,
      }));
      return { ...pushHistory(s), pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  setBackgroundGradient: (gradient) => {
    set((s) => {
      const pages = mapActivePage(s.pages, s.activePageId, (p) => ({
        ...p,
        backgroundGradient: gradient,
      }));
      return { ...pushHistory(s), pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  loadTemplate: (template) => {
    const newElements = template.elements.map((elData) => {
      const id = genId();
      return { ...elData, id } as EditorElement;
    });
    set((s) => {
      const pages = mapActivePage(s.pages, s.activePageId, (p) => ({
        ...p,
        elements: newElements,
        backgroundColor: template.backgroundColor,
        backgroundGradient: template.backgroundGradient ?? null,
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        format: template.format || s.format,
        selectedIds: [],
      };
    });
  },

  moveElement: (id, direction) => {
    set((s) => {
      const page = s.pages.find((p) => p.elements.some((e) => e.id === id));
      if (!page) return s;
      const idx = page.elements.findIndex((el) => el.id === id);
      const swapIdx = direction === "up" ? idx + 1 : idx - 1;
      if (swapIdx < 0 || swapIdx >= page.elements.length) return s;
      const pages = mapPageOfElement(s.pages, id, (p) => {
        const arr = [...p.elements];
        [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
        return { ...p, elements: arr };
      });
      return { ...pushHistory(s), pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  reorderElements: (fromIndex, toIndex) => {
    set((s) => {
      if (fromIndex === toIndex) return s;
      const pages = mapActivePage(s.pages, s.activePageId, (p) => {
        const arr = [...p.elements];
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        return { ...p, elements: arr };
      });
      return { ...pushHistory(s), pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  duplicateElement: (id) => {
    const s0 = get();
    const el = s0.pages.flatMap((p) => p.elements).find((e) => e.id === id);
    if (!el) return;
    const newId = genId();
    const dup = { ...el, id: newId, x: el.x + 20, y: el.y + 20 };
    set((s) => {
      const pages = mapPageOfElement(s.pages, id, (p) => ({
        ...p,
        elements: [...p.elements, dup],
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        selectedIds: [newId],
      };
    });
  },

  duplicateSelectedElements: () => {
    const s0 = get();
    if (s0.selectedIds.length === 0) return;
    const idSet = new Set(s0.selectedIds);
    const ownerPageId = pageIdOfElement(s0.pages, s0.selectedIds[0]);
    if (!ownerPageId) return;
    const page = s0.pages.find((p) => p.id === ownerPageId)!;
    const newEls: EditorElement[] = [];
    const newIds: string[] = [];
    for (const el of page.elements) {
      if (!idSet.has(el.id)) continue;
      const newId = genId();
      newEls.push({ ...el, id: newId, x: el.x + 20, y: el.y + 20 });
      newIds.push(newId);
    }
    set((s) => {
      const pages = mapPageOfElement(s.pages, s.selectedIds[0], (p) => ({
        ...p,
        elements: [...p.elements, ...newEls],
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        selectedIds: newIds,
      };
    });
  },

  copySelection: () => {
    const s = get();
    if (s.selectedIds.length === 0) return;
    const idSet = new Set(s.selectedIds);
    const copied = s.elements.filter((el) => idSet.has(el.id)).map((el) => ({ ...el }));
    set({ clipboard: copied });
  },

  // Paste always lands on the active page — that's the artboard the user is
  // working in, which may not be the one the copy came from.
  pasteClipboard: () => {
    const s0 = get();
    if (!s0.clipboard || s0.clipboard.length === 0) return;
    const newEls: EditorElement[] = [];
    const newIds: string[] = [];
    for (const el of s0.clipboard) {
      const id = genId();
      newEls.push({ ...el, id, x: el.x + 20, y: el.y + 20 } as EditorElement);
      newIds.push(id);
    }
    set((s) => {
      const pages = mapActivePage(s.pages, s.activePageId, (p) => ({
        ...p,
        elements: [...p.elements, ...newEls],
      }));
      return {
        ...pushHistory(s),
        pages,
        ...mirrorOf(pages, s.activePageId),
        selectedIds: newIds,
      };
    });
  },

  bringToFront: (id) => {
    set((s) => {
      const page = s.pages.find((p) => p.elements.some((e) => e.id === id));
      if (!page) return s;
      const idx = page.elements.findIndex((el) => el.id === id);
      if (idx === page.elements.length - 1) return s;
      const pages = mapPageOfElement(s.pages, id, (p) => {
        const arr = [...p.elements];
        const [moved] = arr.splice(idx, 1);
        arr.push(moved);
        return { ...p, elements: arr };
      });
      return { ...pushHistory(s), pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  sendToBack: (id) => {
    set((s) => {
      const page = s.pages.find((p) => p.elements.some((e) => e.id === id));
      if (!page) return s;
      const idx = page.elements.findIndex((el) => el.id === id);
      if (idx <= 0) return s;
      const pages = mapPageOfElement(s.pages, id, (p) => {
        const arr = [...p.elements];
        const [moved] = arr.splice(idx, 1);
        arr.unshift(moved);
        return { ...p, elements: arr };
      });
      return { ...pushHistory(s), pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  loadProject: (project) => {
    const pages = project.pages.length > 0 ? project.pages : [makePage()];
    set({
      projectId: project.id,
      projectName: project.name,
      pages,
      activePageId: pages[0].id,
      ...mirrorOf(pages, pages[0].id),
      format: project.format,
      selectedIds: [],
      past: [],
      future: [],
      panX: 0,
      panY: 0,
    });
  },

  newProject: () => {
    const page = makePage();
    set({
      projectId: `proj_${Date.now()}`,
      projectName: "Untitled",
      pages: [page],
      activePageId: page.id,
      ...mirrorOf([page], page.id),
      selectedIds: [],
      format: CANVAS_FORMATS[0],
      zoom: 100,
      panX: 0,
      panY: 0,
      lastSavedAt: null,
      past: [],
      future: [],
    });
  },

  markSaved: () => set({ lastSavedAt: Date.now() }),

  setActivePage: (id) => {
    set((s) => {
      if (id === s.activePageId) return s;
      if (!s.pages.some((p) => p.id === id)) return s;
      return { activePageId: id, ...mirrorOf(s.pages, id), selectedIds: [] };
    });
  },

  addPage: (afterId) => {
    set((s) => {
      if (s.pages.length >= MAX_PAGES) return s;
      const page = makePage();
      const at = afterId ? s.pages.findIndex((p) => p.id === afterId) : s.pages.length - 1;
      const pages = [...s.pages];
      pages.splice(at + 1, 0, page);
      return {
        ...pushHistory(s),
        pages,
        activePageId: page.id,
        ...mirrorOf(pages, page.id),
        selectedIds: [],
      };
    });
  },

  duplicatePage: (id) => {
    set((s) => {
      if (s.pages.length >= MAX_PAGES) return s;
      const idx = s.pages.findIndex((p) => p.id === id);
      if (idx === -1) return s;
      const source = s.pages[idx];
      // Fresh element ids: ids are the handle for selection, snapping and the
      // Konva node lookup, so a duplicate sharing them would be indistinguishable
      // from its original.
      const copy = makePage({
        elements: source.elements.map((el) => ({ ...el, id: genId() })),
        backgroundColor: source.backgroundColor,
        backgroundGradient: source.backgroundGradient,
      });
      const pages = [...s.pages];
      pages.splice(idx + 1, 0, copy);
      return {
        ...pushHistory(s),
        pages,
        activePageId: copy.id,
        ...mirrorOf(pages, copy.id),
        selectedIds: [],
      };
    });
  },

  removePage: (id) => {
    set((s) => {
      if (s.pages.length <= 1) return s; // a project always has one artboard
      const idx = s.pages.findIndex((p) => p.id === id);
      if (idx === -1) return s;
      const pages = s.pages.filter((p) => p.id !== id);
      const nextActive =
        s.activePageId === id ? pages[Math.min(idx, pages.length - 1)].id : s.activePageId;
      return {
        ...pushHistory(s),
        pages,
        activePageId: nextActive,
        ...mirrorOf(pages, nextActive),
        selectedIds: [],
      };
    });
  },

  movePage: (id, direction) => {
    set((s) => {
      const idx = s.pages.findIndex((p) => p.id === id);
      if (idx === -1) return s;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= s.pages.length) return s;
      const pages = [...s.pages];
      [pages[idx], pages[target]] = [pages[target], pages[idx]];
      return { ...pushHistory(s), pages, ...mirrorOf(pages, s.activePageId) };
    });
  },

  undo: () => {
    set((s) => {
      if (s.past.length === 0) return s;
      const prev = s.past[s.past.length - 1];
      // The restored stack may not contain the page that is active now (undoing
      // an "add page"), so fall back to the snapshot's own active page.
      const activePageId = prev.pages.some((p) => p.id === s.activePageId)
        ? s.activePageId
        : prev.activePageId;
      return {
        past: s.past.slice(0, -1),
        future: [
          { pages: s.pages, activePageId: s.activePageId },
          ...s.future.slice(0, 49),
        ],
        pages: prev.pages,
        activePageId,
        ...mirrorOf(prev.pages, activePageId),
        selectedIds: [],
      };
    });
  },

  redo: () => {
    set((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      const activePageId = next.pages.some((p) => p.id === s.activePageId)
        ? s.activePageId
        : next.activePageId;
      return {
        past: [...s.past, { pages: s.pages, activePageId: s.activePageId }],
        future: s.future.slice(1),
        pages: next.pages,
        activePageId,
        ...mirrorOf(next.pages, activePageId),
        selectedIds: [],
      };
    });
  },
}));
