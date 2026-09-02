import type { CanvasFormat, Page } from "../types/editor";
import { IS_DESKTOP } from "./platform";
import { dexieProjectRepo } from "./project-repo-dexie";
import { sqliteProjectRepo } from "./project-repo-sqlite";

/**
 * The local persistence boundary.
 *
 * Every read and write of a locally-stored project goes through this interface
 * — nothing outside `project-repo-*.ts` touches the storage engine directly.
 * The point is that the engine is swappable: the browser build persists to
 * IndexedDB via Dexie, and a desktop (Electron) build persists to SQLite in the
 * main process, reached over IPC. Both satisfy this interface, so the editor,
 * the autosave loop and the sync layer are written once.
 *
 * Everything is async for that reason. Dexie is already async, and an IPC hop
 * cannot be anything else — keeping the signatures async means the SQLite
 * implementation drops in without touching a single caller.
 */

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  format: CanvasFormat;
  createdAt: Date;
  updatedAt: Date;
  /** Local-only: set when a server push is pending (offline/failed). Not indexed. */
  dirty?: boolean;
}

/**
 * What the editor knows about a project. The timestamps are deliberately absent:
 * `createdAt` is preserved and `updatedAt` is stamped by the repository, so no
 * caller has to remember the read-modify-write that keeps them honest.
 */
export interface ProjectInput {
  id: string;
  name: string;
  pages: Page[];
  format: CanvasFormat;
}

export interface ProjectRepo {
  get(id: string): Promise<Project | undefined>;
  /** Every project, newest first. */
  list(): Promise<Project[]>;
  /** The most recently updated project — what the editor opens on boot. */
  latest(): Promise<Project | undefined>;
  count(): Promise<number>;

  /**
   * Write the editor's current state, preserving `createdAt` and stamping
   * `updatedAt`. Returns the stored record so the caller can hand it to the
   * sync layer without reading it back.
   *
   * Note this clears `dirty`, since the input carries no such field: autosave
   * calls `pushProject` immediately afterwards, which sets the flag according
   * to how that push actually went.
   */
  save(input: ProjectInput): Promise<Project>;
  /** Write a complete record verbatim — used by sync, which owns `dirty`. */
  put(project: Project): Promise<void>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;

  /** Generic key/value store for app-level state (e.g. the pending-delete queue). */
  getSetting<T>(key: string): Promise<T | undefined>;
  setSetting(key: string, value: unknown): Promise<void>;
  clearSettings(): Promise<void>;
}

/**
 * The active implementation, chosen at build time.
 *
 * This is the only place the two ever meet. `IS_DESKTOP` is a compile-time
 * constant, so the web bundle keeps Dexie and drops the SQLite adapter, and the
 * desktop bundle does the reverse — neither build carries a live reference to
 * the other's engine.
 */
export const projectRepo: ProjectRepo = IS_DESKTOP ? sqliteProjectRepo : dexieProjectRepo;
