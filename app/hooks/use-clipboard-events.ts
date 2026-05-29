"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "../store/editor-store";
import {
  CLIPBOARD_MARKER,
  parseClipboardPayload,
  serializeElements,
  stripIdsAndOffset,
} from "../lib/clipboard";

const PASTE_OFFSET = 20;

function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return true;
  if (t.isContentEditable) return true;
  return false;
}

function selectionHasText(): boolean {
  const sel = window.getSelection();
  return !!sel && sel.toString().length > 0;
}

export function useClipboardEvents() {
  const lastSignature = useRef<string>("");
  const pasteCount = useRef<number>(0);

  useEffect(() => {
    const writeSelected = (e: ClipboardEvent, removeAfter: boolean) => {
      if (isEditableTarget(e.target) || selectionHasText()) return;
      const state = useEditorStore.getState();
      if (state.selectedIds.length === 0) return;
      const cd = e.clipboardData;
      if (!cd) return;
      const idSet = new Set(state.selectedIds);
      const selected = state.elements.filter((el) => idSet.has(el.id));
      if (selected.length === 0) return;
      const text = serializeElements(selected);
      e.preventDefault();
      cd.setData("text/plain", text);
      lastSignature.current = text;
      pasteCount.current = 0;
      if (removeAfter) state.removeSelectedElements();
    };

    const onCopy = (e: ClipboardEvent) => writeSelected(e, false);
    const onCut = (e: ClipboardEvent) => writeSelected(e, true);

    const onPaste = (e: ClipboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const cd = e.clipboardData;
      if (!cd) return;
      const text = cd.getData("text/plain");
      if (!text || !text.startsWith(CLIPBOARD_MARKER)) return;
      const elements = parseClipboardPayload(text);
      if (!elements || elements.length === 0) return;
      e.preventDefault();
      if (text === lastSignature.current) {
        pasteCount.current += 1;
      } else {
        lastSignature.current = text;
        pasteCount.current = 1;
      }
      const offset = PASTE_OFFSET * pasteCount.current;
      const items = stripIdsAndOffset(elements, offset);
      useEditorStore.getState().addMultipleElements(items);
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
    };
  }, []);
}
