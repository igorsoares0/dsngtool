"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/editor-store";
import { db } from "../lib/db";
import { pushProject } from "../lib/project-sync";

const AUTOSAVE_INTERVAL = 3000;

export function useAutosave() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSaving = useRef(false);

  useEffect(() => {
    const save = async () => {
      if (isSaving.current) return;
      isSaving.current = true;

      try {
        const s = useEditorStore.getState();
        const record = {
          id: s.projectId,
          name: s.projectName,
          pages: s.pages,
          format: s.format,
          createdAt: (await db.projects.get(s.projectId))?.createdAt ?? new Date(),
          updatedAt: new Date(),
        };
        await db.projects.put(record);
        s.markSaved();
        // Mirror to the server (fire-and-forget; buffers as dirty if offline).
        void pushProject(record);
      } catch {
        // IndexedDB may be unavailable in some contexts — silent fail
      } finally {
        isSaving.current = false;
      }
    };

    const unsub = useEditorStore.subscribe(
      (state, prevState) => {
        // `pages` is the whole document now — it changes identity on every
        // element edit, background change, and page add/remove/reorder, so the
        // per-field checks it replaces are all covered.
        const changed =
          state.pages !== prevState.pages ||
          state.format !== prevState.format ||
          state.projectName !== prevState.projectName;

        if (!changed) return;

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(save, AUTOSAVE_INTERVAL);
      }
    );

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
