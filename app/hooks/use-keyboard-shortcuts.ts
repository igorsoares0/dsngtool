"use client";

import { useEffect } from "react";
import { useEditorStore } from "../store/editor-store";

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      }

      if ((ctrl && e.key === "z" && e.shiftKey) || (ctrl && e.key === "y")) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const { selectedId, removeElement } = useEditorStore.getState();
        if (selectedId) {
          e.preventDefault();
          removeElement(selectedId);
        }
      }

      if (ctrl && e.key === "d") {
        const { selectedId, duplicateElement } = useEditorStore.getState();
        if (selectedId) {
          e.preventDefault();
          duplicateElement(selectedId);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
