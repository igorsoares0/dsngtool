import type { Project, ProjectInput } from "./project-repo";

// Typed view of the object desktop/preload.js exposes on `window`.
//
// This is the whole surface the renderer has into the main process — there is
// no Node in the renderer (contextIsolation on, nodeIntegration off), so
// anything not listed here simply cannot be reached.

/**
 * Timestamps cross the IPC boundary as epoch ms rather than Date objects.
 * Electron's structured clone would carry a Date, but pinning the wire format
 * to primitives keeps the contract explicit and independent of that.
 */
export type WireProject = Omit<Project, "createdAt" | "updatedAt"> & {
  createdAt: number;
  updatedAt: number;
};

export interface ImportedAsset {
  /** An app:// URL the renderer can put straight into an image element. */
  url: string;
  bytes: number;
}

export interface DesktopBridge {
  repo: {
    get(id: string): Promise<WireProject | undefined>;
    list(): Promise<WireProject[]>;
    latest(): Promise<WireProject | undefined>;
    count(): Promise<number>;
    save(input: ProjectInput): Promise<WireProject>;
    put(project: WireProject): Promise<void>;
    delete(id: string): Promise<void>;
    clear(): Promise<void>;
    getSetting<T>(key: string): Promise<T | undefined>;
    setSetting(key: string, value: unknown): Promise<void>;
    clearSettings(): Promise<void>;
  };
  assets: {
    /** Copy image bytes into the app's asset folder; resolves to its app:// URL. */
    import(fileName: string, bytes: Uint8Array): Promise<ImportedAsset>;
  };
  files: {
    /** One item shows a save dialog; several ask for a destination folder. */
    saveImages(items: ImageToSave[]): Promise<{ saved: number; path?: string }>;
    saveProject(name: string, text: string): Promise<{ saved: boolean; path?: string }>;
    openProject(): Promise<OpenedProjectFile | null>;
  };
  menu: {
    /** Subscribe to application-menu commands; returns an unsubscribe function. */
    onCommand(callback: (command: string) => void): () => void;
  };
}

export interface ImageToSave {
  fileName: string;
  /** A `data:image/…;base64,…` URL, as Konva's toDataURL() produces. */
  dataUrl: string;
}

export interface OpenedProjectFile {
  text: string;
  /** Filename without extension — a fallback name for a file that carries none. */
  name: string;
  path: string;
}

declare global {
  interface Window {
    /** Injected by desktop/preload.js. Absent in the browser build. */
    modoDesktop?: DesktopBridge;
  }
}

export function desktopBridge(): DesktopBridge {
  const api = typeof window !== "undefined" ? window.modoDesktop : undefined;
  if (!api) {
    // Reaching here means the desktop flag was set for a build that isn't
    // running inside Electron. Failing loudly beats silently losing user work.
    throw new Error(
      "desktop-bridge: window.modoDesktop is missing — the desktop preload did not run."
    );
  }
  return api;
}
