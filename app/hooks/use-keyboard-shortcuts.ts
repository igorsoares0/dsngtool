"use client";

import { useEffect } from "react";
import { useEditorStore } from "../store/editor-store";
import {
  readElementsFromClipboard,
  writeElementsToClipboard,
} from "../lib/clipboard";

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

      if (ctrl && (e.key === "c" || e.key === "x")) {
        const { selectedIds, elements, removeSelectedElements } = useEditorStore.getState();
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const selectedSet = new Set(selectedIds);
        const toCopy = elements.filter((el) => selectedSet.has(el.id));
        void writeElementsToClipboard(toCopy).then((ok) => {
          if (ok && e.key === "x") removeSelectedElements();
        });
      }

      if (ctrl && e.key === "v") {
        e.preventDefault();
        void readElementsFromClipboard().then((items) => {
          if (!items || items.length === 0) return;
          useEditorStore.getState().addMultipleElements(items);
        });
      }

      if (
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowDown"
      ) {
        const { selectedIds, elements, updateMultipleElements } = useEditorStore.getState();
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        const selectedSet = new Set(selectedIds);
        const updates = new Map<string, { x: number; y: number }>();
        for (const el of elements) {
          if (selectedSet.has(el.id) && !el.locked) {
            updates.set(el.id, { x: el.x + dx, y: el.y + dy });
          }
        }
        if (updates.size > 0) updateMultipleElements(updates);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}
