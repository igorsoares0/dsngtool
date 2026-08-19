"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { db } from "../lib/db";
import { normalizePages } from "../lib/project-data";
import { syncProjects, syncDirty, setPushRejectedHandler } from "../lib/project-sync";
import { toast } from "../store/toast-store";

/** Server-side rejection codes from PUT /api/projects/[id], in the user's terms. */
const REJECTION_MESSAGES: Record<string, string> = {
  project_too_large: "This design is too large to sync. It stays saved on this device.",
  project_limit_reached: "You've reached the project limit. Delete one to sync new designs.",
  name_too_long: "That project name is too long to sync.",
};

function loadRecord(p: import("../lib/db").Project) {
  useEditorStore.getState().loadProject({
    id: p.id,
    name: p.name,
    // A row cached before the multi-page change may predate the Dexie v3
    // upgrade in this browser, so normalise rather than trusting `pages`.
    pages: normalizePages(p),
    format: p.format,
  });
}

async function loadLatest(): Promise<boolean> {
  try {
    const latest = await db.projects.orderBy("updatedAt").reverse().first();
    if (!latest) return false;
    loadRecord(latest);
    return true;
  } catch {
    return false;
  }
}

/** Load a specific project by id (from the dashboard). Falls back to latest. */
async function loadById(id: string): Promise<boolean> {
  try {
    const p = await db.projects.get(id);
    if (!p) return loadLatest();
    loadRecord(p);
    return true;
  } catch {
    return false;
  }
}

export function useProjectLoader() {
  const [ready, setReady] = useState(false);
  // Strict Mode (on by default in the App Router) invokes effects twice in dev.
  // The boot below *consumes* its intent params — it strips `?new=`/`?project=`
  // from the URL — so a second pass would read no intent, fall through to
  // "open the most recent project", and silently replace the blank canvas the
  // user just asked for. Ref, not module scope: it must reset when the editor
  // genuinely remounts (navigating dashboard -> editor again).
  const booted = useRef(false);

  useEffect(() => {
    // Guards only the boot — the listener below must still be re-registered on
    // the second pass, since the first pass's cleanup tore it down.
    if (!booted.current) {
      booted.current = true;
      void boot();
    }

    // A permanently refused push is silent otherwise: the design stays in
    // IndexedDB and the editor carries on, so the user would only find out
    // their work never left this device on the next machine they sign in from.
    setPushRejectedHandler((error) => {
      const message = REJECTION_MESSAGES[error];
      if (message) toast.error(message, 6000);
    });

    // Retry buffered pushes/deletes when connectivity returns.
    const onOnline = () => syncDirty().catch(() => {});
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
      setPushRejectedHandler(null);
    };

    async function boot() {
      const params = new URLSearchParams(window.location.search);
      const wantNew = params.get("new");
      const wantProject = params.get("project");

      // Clean intent params so a refresh doesn't re-create/re-open.
      if (wantNew || wantProject) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      try {
        if (wantNew) {
          // Coming from the dashboard's "New project" — start blank, sync in bg.
          useEditorStore.getState().newProject();
          setReady(true);
          syncProjects().catch(() => {});
          return;
        }
        if (wantProject) {
          // Coming from the dashboard's "Open" — make sure it's local, then load.
          await syncProjects().catch(() => {});
          await loadById(wantProject);
          setReady(true);
          return;
        }

        const count = await db.projects.count();
        if (count > 0) {
          // Have local projects: show the latest instantly, sync in background.
          await loadLatest();
          setReady(true);
          syncProjects().catch(() => {});
        } else {
          // Fresh device / cleared browser: pull from the server first so a
          // returning user sees their work instead of a blank canvas.
          await syncProjects().catch(() => {});
          await loadLatest();
          setReady(true);
        }
      } catch {
        setReady(true); // IndexedDB unavailable — start fresh
      }
    }
  }, []);

  return ready;
}
