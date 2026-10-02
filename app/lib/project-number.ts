"use client";

import { create } from "zustand";

/**
 * The "Nº 014" shown on dashboard cards and in the editor topbar.
 *
 * There is no stored sequence — a project's number is its position in the
 * account's creation order, counted over every row the server returns,
 * tombstones included. Counting deleted projects too is what keeps a number
 * stable: deleting Nº 003 does not renumber 004 onwards.
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
  /** How many rows the server knows about — a brand-new, not-yet-synced
   *  project is provisionally the next one. */
  total: number;
  setFromServer: (rows: { id: string; createdAt: string | Date }[]) => void;
}

/** Filled by `syncProjects` so the editor can show the number without a
 *  separate request. */
export const useProjectNumbers = create<ProjectNumberState>((set) => ({
  numbers: {},
  total: 0,
  setFromServer: (rows) => set({ numbers: numberProjects(rows), total: rows.length }),
}));

/** The number for `id`, or the provisional next number when the server has
 *  not seen the project yet. Undefined before the first sync. */
export function useProjectNumber(id: string | null): number | undefined {
  return useProjectNumbers((s) => {
    if (!id || s.total === 0) return undefined;
    return s.numbers[id] ?? s.total + 1;
  });
}
