"use client";

import { db, type Project } from "./db";
import { embedAssets, restoreAssets, validateFormat, validatePages } from "./project-io";
import { normalizePages } from "./project-data";

/**
 * Whole-device backup: every project plus every image they use, in one file.
 * Designs live only in this browser now, so this is how they move to a new
 * device, survive a cleared browser, or get archived.
 */

export const BACKUP_EXTENSION = "modobackup";
const KIND = "modo-backup";
const VERSION = 1;

interface BackupFile {
  kind: typeof KIND;
  version: number;
  exportedAt: string;
  projects: Array<Omit<Project, "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string }>;
  assets: Awaited<ReturnType<typeof embedAssets>>;
}

export async function downloadBackup(): Promise<number> {
  const projects = await db.projects.toArray();
  const pages = projects.flatMap((p) => normalizePages(p));
  const file: BackupFile = {
    kind: KIND,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      format: p.format,
      pages: normalizePages(p),
      createdAt: new Date(p.createdAt).toISOString(),
      updatedAt: new Date(p.updatedAt).toISOString(),
    })),
    assets: await embedAssets(pages),
  };
  const blob = new Blob([JSON.stringify(file)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `modo-backup-${new Date().toISOString().slice(0, 10)}.${BACKUP_EXTENSION}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return projects.length;
}

export interface RestoreResult {
  added: number;
  updated: number;
  skipped: number;
}

/**
 * Merge a backup into this device. A project that exists here is replaced only
 * when the backup's copy is newer, so restoring an old backup never rolls back
 * work done since.
 */
export async function restoreBackup(file: File): Promise<RestoreResult> {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a Modo backup.");
  }
  if (data?.kind !== KIND || !Array.isArray(data.projects)) {
    throw new Error("That file isn't a Modo backup.");
  }
  if ((data.version ?? 0) > VERSION) {
    throw new Error("This backup comes from a newer version of Modo. Reload to update, then try again.");
  }

  await restoreAssets(data.assets);

  const result: RestoreResult = { added: 0, updated: 0, skipped: 0 };
  for (const raw of data.projects) {
    try {
      if (typeof raw?.id !== "string") throw new Error();
      const record: Project = {
        id: raw.id,
        name: typeof raw.name === "string" ? raw.name : "Restored",
        format: validateFormat(raw.format),
        pages: validatePages(raw as unknown as Record<string, unknown>),
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
      };
      const existing = await db.projects.get(record.id);
      if (existing && new Date(existing.updatedAt) >= record.updatedAt) {
        result.skipped++;
        continue;
      }
      await db.projects.put(record);
      if (existing) result.updated++;
      else result.added++;
    } catch {
      result.skipped++;
    }
  }
  return result;
}
