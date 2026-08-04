"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { db } from "../lib/db";
import { syncProjects, syncDirty } from "../lib/project-sync";

function loadRecord(p: {
  id: string;
  name: string;
  elements: import("../lib/db").Project["elements"];
  backgroundColor: string;
  backgroundGradient?: import("../lib/db").Project["backgroundGradient"];
  format: import("../lib/db").Project["format"];
}) {
  useEditorStore.getState().loadProject({
    id: p.id,
    name: p.name,
    elements: p.elements,
    backgroundColor: p.backgroundColor,
    backgroundGradient: p.backgroundGradient ?? null,
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

  useEffect(() => {
    (async () => {
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
    })();

    // Retry buffered pushes/deletes when connectivity returns.
    const onOnline = () => syncDirty().catch(() => {});
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, []);

  return ready;
}
