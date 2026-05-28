"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/editor-store";
import { db } from "../lib/db";

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
        await db.projects.put({
          id: s.projectId,
          name: s.projectName,
          elements: s.elements,
          backgroundColor: s.backgroundColor,
          backgroundGradient: s.backgroundGradient,
          format: s.format,
          createdAt: (await db.projects.get(s.projectId))?.createdAt ?? new Date(),
          updatedAt: new Date(),
        });
        s.markSaved();
      } catch {
        // IndexedDB may be unavailable in some contexts — silent fail
      } finally {
        isSaving.current = false;
      }
    };

    const unsub = useEditorStore.subscribe(
      (state, prevState) => {
        const changed =
          state.elements !== prevState.elements ||
          state.backgroundColor !== prevState.backgroundColor ||
          state.backgroundGradient !== prevState.backgroundGradient ||
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
