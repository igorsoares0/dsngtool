"use client";

import { useEffect, useState } from "react";
import { useEditorStore } from "../store/editor-store";
import { db } from "../lib/db";

export function useProjectLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const latest = await db.projects.orderBy("updatedAt").reverse().first();
        if (latest) {
          useEditorStore.getState().loadProject({
            id: latest.id,
            name: latest.name,
            elements: latest.elements,
            backgroundColor: latest.backgroundColor,
            backgroundGradient: latest.backgroundGradient ?? null,
            format: latest.format,
          });
        }
      } catch {
        // IndexedDB unavailable — start fresh
      } finally {
        setReady(true);
      }
    })();
  }, []);

  return ready;
}
