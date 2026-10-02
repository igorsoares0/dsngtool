import { create } from "zustand";
import { useEditorStore } from "./editor-store";

/** Drives the 4px bar on the toast's left edge: success / warning / danger
 *  (error) / tertiary (info, action). */
export type ToastType = "success" | "error" | "warning" | "info" | "action";

/** Every toast auto-dismisses after this unless told otherwise. */
export const TOAST_MS = 5000;

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  /** Optional mono second line, e.g. "1080 × 1080 · 412 KB". */
  sub?: string;
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
  success: (message: string, duration = TOAST_MS) =>
    useToastStore.getState().add({ type: "success", message, duration }),
  error: (message: string, duration = TOAST_MS) =>
    useToastStore.getState().add({ type: "error", message, duration }),
  warning: (message: string, duration = TOAST_MS) =>
    useToastStore.getState().add({ type: "warning", message, duration }),
  info: (message: string, duration = TOAST_MS) =>
    useToastStore.getState().add({ type: "info", message, duration }),
  action: (
    message: string,
    actionLabel: string,
    onAction: () => void,
    duration = TOAST_MS
  ) =>
    useToastStore
      .getState()
      .add({ type: "action", message, actionLabel, onAction, duration }),
  /** Full form: any type, with an optional sub line and action. */
  show: (t: Omit<Toast, "id" | "duration"> & { duration?: number }) =>
    useToastStore.getState().add({ duration: TOAST_MS, ...t }),
};

/**
 * Shows a "deleted" toast with an Undo action wired to the editor history.
 * Used by every element-deletion entry point so the feedback stays consistent.
 */
export function toastDeleted(count: number, label?: string) {
  toast.show({
    type: "action",
    message: count === 1 ? "Layer deleted" : `${count} layers deleted`,
    sub: count === 1 && label ? label : undefined,
    actionLabel: "Undo",
    onAction: () => useEditorStore.getState().undo(),
  });
}
