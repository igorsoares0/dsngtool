"use client";

import { useEditorStore } from "../store/editor-store";
import { projectRepo } from "./project-repo";
import { toast } from "../store/toast-store";

/**
 * Write the current document to local storage and report it to the user.
 *
 * Shared by the topbar's File ▸ Save and, on desktop, the native File ▸ Save
 * menu item, so the two can't drift. Autosave does not go through here — it
 * saves silently, and a toast every three seconds would be noise.
 */
export async function saveCurrentProject(): Promise<boolean> {
  const s = useEditorStore.getState();
  try {
    await projectRepo.save({
      id: s.projectId,
      name: s.projectName,
      pages: s.pages,
      format: s.format,
    });
    s.markSaved();
    toast.success("Project saved");
    return true;
  } catch {
    toast.error("Couldn't save project");
    return false;
  }
}
