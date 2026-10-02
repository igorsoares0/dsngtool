"use client";

import { useEffect, useRef, useState } from "react";
import { useToastStore, type Toast } from "../../store/toast-store";
import { CloseIcon } from "./icons";

/** The 4px bar on the toast's left edge carries the type — no icons. */
const BAR: Record<Toast["type"], string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-danger",
  info: "bg-text-tertiary",
  action: "bg-text-tertiary",
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = () => {
    timerRef.current = setTimeout(() => dismiss(toast.id), toast.duration);
  };
  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      onMouseEnter={clearTimer}
      onMouseLeave={startTimer}
      className="pointer-events-auto flex items-stretch min-h-[52px] w-[340px] max-w-[calc(100vw-2rem)] bg-surface-inverse text-text-inverse rounded-float shadow-pop overflow-hidden animate-toast-in"
    >
      <span className={`w-1 shrink-0 ${BAR[toast.type]}`} aria-hidden />
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 px-3 py-2">
        <span className="text-[13px] font-semibold leading-snug">{toast.message}</span>
        {toast.sub && (
          <span className="font-mono text-[10.5px] uppercase opacity-70 truncate">{toast.sub}</span>
        )}
      </div>
      {toast.actionLabel && toast.onAction ? (
        <button
          onClick={() => {
            toast.onAction?.();
            dismiss(toast.id);
          }}
          className="flex items-center px-3.5 text-[12.5px] font-bold border-l border-[rgb(128_128_128/0.3)] hover:bg-[rgb(128_128_128/0.18)] shrink-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          {toast.actionLabel}
        </button>
      ) : (
        <button
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss"
          className="flex items-center px-3 opacity-60 hover:opacity-100 border-l border-[rgb(128_128_128/0.3)] shrink-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          <CloseIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const [mounted, setMounted] = useState(false);

  // Avoid SSR/client mismatch — toasts are purely client-driven.
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    // Bottom-right, above the editor's status bar.
    <div className="fixed bottom-10 right-4 z-[120] flex flex-col items-end gap-2 pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
