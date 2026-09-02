"use client";

import { useEffect, useRef } from "react";
import { IS_DESKTOP } from "../lib/platform";
import { useEditorStore } from "../store/editor-store";
import { toast, toastDeleted } from "../store/toast-store";
import { saveCurrentProject } from "../lib/save-project";
import { openProjectFromDisk, saveProjectToDisk } from "../lib/desktop-files";
import { ImportError } from "../lib/project-io";

/**
 * Run `handler` when the native application menu fires `command`.
 *
 * The IPC channel doubles as the command bus, so a component subscribes to the
 * menu items it can actually service — the layout takes File and Edit, the
 * canvas takes the zoom items — instead of threading callbacks down through
 * props from a single central listener.
 *
 * A no-op in the web build: IS_DESKTOP is a compile-time false there, and there
 * is no `window.modoDesktop` to subscribe to.
 */
export function useDesktopMenuCommand(command: string, handler: () => void) {
  // The handler is almost always an inline arrow, so a fresh identity every
  // render. Held in a ref, the subscription is created once instead of being
  // torn down and rebuilt on each one.
  //
  // The ref is updated in an effect rather than during render: writing to a ref
  // while rendering is not allowed under React 19's rules, and a menu command
  // can only arrive after commit anyway.
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!IS_DESKTOP) return;
    const bridge = window.modoDesktop;
    if (!bridge) return;
    return bridge.menu.onCommand((received) => {
      if (received === command) handlerRef.current();
    });
  }, [command]);
}

/**
 * Whether typing is in progress.
 *
 * Mirrors the guard in use-keyboard-shortcuts.ts. It matters more here: a menu
 * accelerator wins over the renderer's keydown listener, so without this Cmd+Z
 * while renaming a project would undo the *document* instead of the text.
 */
function isEditingText(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

/** Editor-wide menu wiring. The zoom items are handled by the canvas instead. */
export function useDesktopMenuActions({
  onOpenProjects,
  onOpenExport,
  onOpenShortcuts,
}: {
  onOpenProjects: () => void;
  onOpenExport: () => void;
  onOpenShortcuts: () => void;
}) {
  useDesktopMenuCommand("new-project", () => useEditorStore.getState().newProject());
  useDesktopMenuCommand("open-projects", onOpenProjects);
  useDesktopMenuCommand("export", onOpenExport);
  useDesktopMenuCommand("shortcuts", onOpenShortcuts);
  useDesktopMenuCommand("save", () => void saveCurrentProject());

  useDesktopMenuCommand("open-file", () => {
    void (async () => {
      try {
        const imported = await openProjectFromDisk();
        if (!imported) return; // dialog dismissed — not an error
        useEditorStore.getState().loadProject({
          id: `proj_${Date.now()}`,
          name: imported.name,
          pages: imported.pages,
          format: imported.format,
        });
        toast.success(`Opened "${imported.name}"`);
      } catch (err) {
        toast.error(err instanceof ImportError ? err.message : "Could not open file");
      }
    })();
  });

  useDesktopMenuCommand("save-as", () => {
    void (async () => {
      const s = useEditorStore.getState();
      try {
        const saved = await saveProjectToDisk({
          name: s.projectName,
          format: s.format,
          pages: s.pages,
        });
        if (saved) toast.success("Project file saved");
      } catch {
        toast.error("Couldn't save the project file");
      }
    })();
  });

  useDesktopMenuCommand("undo", () => {
    // execCommand is deprecated but remains the only way to reach a text
    // field's own undo stack; the alternative is silently doing nothing.
    if (isEditingText()) document.execCommand("undo");
    else useEditorStore.getState().undo();
  });

  useDesktopMenuCommand("redo", () => {
    if (isEditingText()) document.execCommand("redo");
    else useEditorStore.getState().redo();
  });

  useDesktopMenuCommand("select-all", () => {
    // Falling through is not an option: the menu accelerator has already
    // swallowed the keystroke, so returning here would leave Cmd+A doing
    // nothing at all inside a text field.
    if (isEditingText()) {
      document.execCommand("selectAll");
      return;
    }
    const { elements, selectAll } = useEditorStore.getState();
    if (elements.length > 0) selectAll();
  });

  useDesktopMenuCommand("duplicate", () => {
    // Same guard the keyboard hook applies: Cmd+D while renaming a project
    // must not duplicate whatever happens to be selected on the canvas.
    if (isEditingText()) return;
    const { selectedIds, duplicateSelectedElements } = useEditorStore.getState();
    if (selectedIds.length > 0) duplicateSelectedElements();
  });

  useDesktopMenuCommand("delete", () => {
    if (isEditingText()) {
      document.execCommand("forwardDelete");
      return;
    }
    const { selectedIds, removeSelectedElements } = useEditorStore.getState();
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    removeSelectedElements();
    toastDeleted(count);
  });
}
