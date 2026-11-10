"use client";

import { create } from "zustand";
import { db } from "./db";

/**
 * The "Nº 014" shown on dashboard cards and in the editor topbar.
 *
 * There is no stored sequence — a project's number is its position in this
 * device's creation order.
 */
export function numberProjects(
  rows: { id: string; createdAt: string | Date }[]
): Record<string, number> {
  const sorted = [...rows].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id)
  );
  const out: Record<string, number> = {};
  sorted.forEach((r, i) => (out[r.id] = i + 1));
  return out;
}

/** "014". */
export function formatProjectNumber(n: number | undefined): string {
  return n === undefined ? "—" : String(n).padStart(3, "0");
}

interface ProjectNumberState {
  numbers: Record<string, number>;
  /** How many projects are saved — a brand-new, not-yet-saved project is
   *  provisionally the next one. */
  total: number;
  /** False until the first count, so nothing flashes a wrong number. */
  loaded: boolean;
  setFromRows: (rows: { id: string; createdAt: string | Date }[]) => void;
}

export const useProjectNumbers = create<ProjectNumberState>((set) => ({
  numbers: {},
  total: 0,
  loaded: false,
  setFromRows: (rows) => set({ numbers: numberProjects(rows), total: rows.length, loaded: true }),
}));

/** Recount from IndexedDB (editor boot). */
export async function refreshProjectNumbers(): Promise<void> {
  try {
    const rows = await db.projects.toArray();
    useProjectNumbers.getState().setFromRows(rows);
  } catch {
    // IndexedDB unavailable — numbers just stay hidden
  }
}

/** The number for `id`, or the provisional next number for an unsaved project.
 *  Undefined until the first count. */
export function useProjectNumber(id: string | null): number | undefined {
  return useProjectNumbers((s) => {
    if (!id || !s.loaded) return undefined;
    return s.numbers[id] ?? s.total + 1;
  });
}
