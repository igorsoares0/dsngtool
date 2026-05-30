import { create } from "zustand";
import { useEditorStore } from "./editor-store";

export type ToastType = "success" | "error" | "info" | "action";

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  add: (t: Omit<Toast, "id">) => number;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (t) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string, duration = 3000) =>
    useToastStore.getState().add({ type: "success", message, duration }),
  error: (message: string, duration = 4500) =>
    useToastStore.getState().add({ type: "error", message, duration }),
  info: (message: string, duration = 3000) =>
    useToastStore.getState().add({ type: "info", message, duration }),
  action: (
    message: string,
    actionLabel: string,
    onAction: () => void,
    duration = 6000
  ) =>
    useToastStore
      .getState()
      .add({ type: "action", message, actionLabel, onAction, duration }),
};

/**
 * Shows a "deleted" toast with an Undo action wired to the editor history.
 * Used by every element-deletion entry point so the feedback stays consistent.
 */
export function toastDeleted(count: number) {
  toast.action(
    count === 1 ? "Element deleted" : `${count} elements deleted`,
    "Undo",
    () => useEditorStore.getState().undo()
  );
}
