"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { db } from "../lib/db";
import { normalizePages } from "../lib/project-data";
import { refreshProjectNumbers } from "../lib/project-number";
import { FORMAT_SLUGS, type CanvasFormat } from "../types/editor";

const FORMAT_PARAMS: Record<string, CanvasFormat | undefined> = FORMAT_SLUGS;

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
    if (booted.current) return;
    booted.current = true;
    void boot();

    async function boot() {
      const params = new URLSearchParams(window.location.search);
      const wantNew = params.get("new");
      const wantProject = params.get("project");
      // The dashboard's format cards pass ?format=post|story|pinterest.
      const wantFormat = FORMAT_PARAMS[params.get("format") ?? ""];

      // Clean intent params so a refresh doesn't re-create/re-open.
      if (wantNew || wantProject) {
        window.history.replaceState(null, "", window.location.pathname);
      }

      try {
        if (wantNew) {
          // Coming from the dashboard's "New project" — start blank.
          useEditorStore.getState().newProject(wantFormat);
        } else if (wantProject) {
          // Coming from the dashboard's "Open".
          await loadById(wantProject);
        } else {
          // Otherwise reopen the most recent design (a fresh device stays blank).
          await loadLatest();
        }
        void refreshProjectNumbers();
        setReady(true);
      } catch {
        setReady(true); // IndexedDB unavailable — start fresh
      }
    }
  }, []);

  return ready;
}
