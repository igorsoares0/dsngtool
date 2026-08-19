"use client";

import { db, type Project } from "./db";
import { normalizePages } from "./project-data";

// Bidirectional last-write-wins sync between IndexedDB (local cache + offline
// buffer) and the server (source of truth across devices). The client's
// `updatedAt` is the LWW clock. Deletions are queued locally so an offline
// delete isn't resurrected by the next pull.

const PENDING_DELETES_KEY = "pendingProjectDeletes";

interface ServerProject {
  id: string;
  name: string;
  // `data` is an opaque JSON column. Rows written before the multi-page change
  // carry the old single-artboard fields instead of `pages`; normalizePages
  // reads either.
  data: {
    pages?: unknown;
    elements?: Project["pages"][number]["elements"];
    backgroundColor?: string;
    backgroundGradient?: Project["pages"][number]["backgroundGradient"];
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
      pages: p.pages,
      format: p.format,
    },
    updatedAt: (p.updatedAt instanceof Date ? p.updatedAt : new Date(p.updatedAt)).toISOString(),
  };
}

function fromServer(sp: ServerProject, createdAt: Date): Project {
  return {
    id: sp.id,
    name: sp.name,
    pages: normalizePages(sp.data),
    format: sp.data.format as Project["format"],
    createdAt,
    updatedAt: new Date(sp.updatedAt),
    dirty: false,
  };
}

/**
 * Server rejections that retrying will never fix: the project is over the size
 * cap, the account is at its project ceiling, or the payload is malformed.
 * Re-sending on every sync would just burn the rate limit, so these clear the
 * dirty flag — the work stays in IndexedDB and the editor keeps working, it
 * simply stops trying to push.
 */
const TERMINAL_PUSH_STATUS = new Set([400, 403, 409, 413]);

// One notification per project per session. A refused project is still re-pushed
// by syncProjects whenever the server has no copy of it — which is what lets a
// user recover by freeing a slot or shrinking the design — so without this the
// same toast would reappear on every sync cycle.
const notifiedRejections = new Set<string>();

/** Push one project to the server. Marks it dirty locally if the push fails. */
export async function pushProject(p: Project): Promise<boolean> {
  try {
    const res = await fetch(`/api/projects/${p.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(p)),
    });
    if (!res.ok) {
      if (TERMINAL_PUSH_STATUS.has(res.status)) {
        const { error } = await res.json().catch(() => ({ error: "rejected" }));
        console.warn(`[sync] server rejected project ${p.id}: ${error}`);
        await markDirty(p.id, false);
        if (!notifiedRejections.has(p.id)) {
          notifiedRejections.add(p.id);
          onPushRejected?.(error as string);
        }
        return false;
      }
      // 401 (signed out), 429 and 5xx are all transient — buffer as dirty.
      await markDirty(p.id, true);
      return false;
    }
    await markDirty(p.id, false);
    notifiedRejections.delete(p.id); // it went through — a later refusal is news again
    return true;
  } catch {
    await markDirty(p.id, true);
    return false;
  }
}

/**
 * Notified when the server permanently refuses a project, so the UI can say so
 * instead of silently never syncing. Set by the editor; sync itself stays free
 * of store/toast imports.
 */
let onPushRejected: ((error: string) => void) | null = null;

export function setPushRejectedHandler(fn: ((error: string) => void) | null) {
  onPushRejected = fn;
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

/**
 * Wipe every trace of the signed-in account from this browser.
 *
 * Must be called after the server confirms an account deletion. Deleting the
 * account server-side does not touch IndexedDB, and the leftovers are not
 * merely stale — they are actively dangerous. `syncProjects` treats a local
 * project the server has never seen as "local is newer" and pushes it up, so
 * signing up again on this browser would upload the *deleted* account's designs
 * into the new one. The pending-delete queue would likewise fire DELETEs at ids
 * that now belong to nobody.
 */
export async function wipeLocalAccountData(): Promise<void> {
  notifiedRejections.clear();
  await db.projects.clear();
  await db.settings.clear();
}

/** Retry only the buffered work (dirty projects + queued deletes). */
export async function syncDirty(): Promise<void> {
  await flushDeletes();
  const dirty = (await db.projects.toArray()).filter((p) => p.dirty);
  for (const p of dirty) await pushProject(p);
}
