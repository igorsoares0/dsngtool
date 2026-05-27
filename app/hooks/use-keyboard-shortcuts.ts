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
        const { selectedIds, removeSelectedElements } = useEditorStore.getState();
        if (selectedIds.length > 0) {
          e.preventDefault();
          removeSelectedElements();
        }
      }

      if (ctrl && e.key === "d") {
        const { selectedIds, duplicateSelectedElements } = useEditorStore.getState();
        if (selectedIds.length > 0) {
          e.preventDefault();
          duplicateSelectedElements();
        }
      }

      if (ctrl && e.key === "a") {
        const { elements } = useEditorStore.getState();
        if (elements.length > 0) {
          e.preventDefault();
          useEditorStore.getState().selectAll();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
