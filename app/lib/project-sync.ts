"use client";

import { db, type Project } from "./db";

// Bidirectional last-write-wins sync between IndexedDB (local cache + offline
// buffer) and the server (source of truth across devices). The client's
// `updatedAt` is the LWW clock. Deletions are queued locally so an offline
// delete isn't resurrected by the next pull.

const PENDING_DELETES_KEY = "pendingProjectDeletes";

interface ServerProject {
  id: string;
  name: string;
  data: {
    elements?: Project["elements"];
    backgroundColor?: string;
    backgroundGradient?: Project["backgroundGradient"];
    format?: Project["format"];
  };
  updatedAt: string;
  deletedAt: string | null;
}

async function getPendingDeletes(): Promise<string[]> {
  const row = await db.settings.get(PENDING_DELETES_KEY);
  return (row?.value as string[]) ?? [];
}
async function setPendingDeletes(ids: string[]) {
  await db.settings.put({ key: PENDING_DELETES_KEY, value: ids });
}

async function markDirty(id: string, dirty: boolean) {
  const p = await db.projects.get(id);
  if (p) await db.projects.put({ ...p, dirty });
}

function toPayload(p: Project) {
  return {
    name: p.name,
    data: {
      elements: p.elements,
      backgroundColor: p.backgroundColor,
      backgroundGradient: p.backgroundGradient ?? null,
      format: p.format,
    },
    updatedAt: (p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt)).toISOString(),
  };
}

function fromServer(sp: ServerProject, createdAt: Date): Project {
  return {
    id: sp.id,
    name: sp.name,
    elements: sp.data.elements ?? [],
    backgroundColor: sp.data.backgroundColor ?? "#ffffff",
    backgroundGradient: sp.data.backgroundGradient ?? null,
    format: sp.data.format as Project["format"],
    createdAt,
    updatedAt: new Date(sp.updatedAt),
    dirty: false,
  };
}

/** Push one project to the server. Marks it dirty locally if the push fails. */
export async function pushProject(p: Project): Promise<boolean> {
  try {
    const res = await fetch(`/api/projects/${p.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(p)),
    });
    if (!res.ok) {
      // 401 (signed out) is expected in some states — still buffer as dirty.
      await markDirty(p.id, true);
      return false;
    }
    await markDirty(p.id, false);
    return true;
  } catch {
    await markDirty(p.id, true);
    return false;
  }
}

/** Delete locally and queue the server-side tombstone (survives offline). */
export async function deleteProjectSynced(id: string) {
  await db.projects.delete(id);
  const pending = await getPendingDeletes();
  if (!pending.includes(id)) await setPendingDeletes([...pending, id]);
  await flushDeletes();
}

async function flushDeletes() {
  const pending = await getPendingDeletes();
  if (pending.length === 0) return;
  const remaining: string[] = [];
  for (const id of pending) {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) remaining.push(id);
    } catch {
      remaining.push(id);
    }
  }
  await setPendingDeletes(remaining);
}

/**
 * Full reconcile: flush queued deletes, pull the server's projects into the
 * local cache (server wins when newer), then push any local-only or
 * locally-newer projects up. No-ops gracefully when offline or signed out.
 */
export async function syncProjects(): Promise<void> {
  await flushDeletes();
  const pendingDeletes = new Set(await getPendingDeletes());

  let serverProjects: ServerProject[];
  try {
    const res = await fetch("/api/projects");
    if (!res.ok) return; // signed out / offline — keep local untouched
    serverProjects = ((await res.json()).projects ?? []) as ServerProject[];
  } catch {
    return;
  }

  const serverMap = new Map(serverProjects.map((sp) => [sp.id, sp]));

  // Server -> local
  for (const sp of serverProjects) {
    if (pendingDeletes.has(sp.id)) continue; // locally deleted; don't resurrect
    const local = await db.projects.get(sp.id);
    if (sp.deletedAt) {
      if (local) await db.projects.delete(sp.id);
      continue;
    }
    if (!local || new Date(sp.updatedAt) > new Date(local.updatedAt)) {
      await db.projects.put(fromServer(sp, local?.createdAt ?? new Date()));
    }
  }

  // Local -> server
  for (const lp of await db.projects.toArray()) {
    const sp = serverMap.get(lp.id);
    const localNewer =
      !sp || (!sp.deletedAt && new Date(lp.updatedAt) > new Date(sp.updatedAt));
    if (localNewer || lp.dirty) await pushProject(lp);
  }
}

/** Retry only the buffered work (dirty projects + queued deletes). */
export async function syncDirty(): Promise<void> {
  await flushDeletes();
  const dirty = (await db.projects.toArray()).filter((p) => p.dirty);
  for (const p of dirty) await pushProject(p);
}
