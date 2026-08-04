"use client";

import { useEffect, useRef } from "react";
import { cx } from "./cx";
import { CloseIcon } from "../editor/icons";

/**
 * The one dialog shell. Before this existed the app had three hand-rolled
 * copies that disagreed about where the scrim lived and which of them closed on
 * Escape. Floating surface: border + shadow, never a docked-panel treatment.
 */
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  width = "max-w-md",
  footer,
  children,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** A max-width utility — the dialog is always `w-full` under it. Pass a
   *  `max-w-*`, not a `w-*`, or it will fight the base width. */
  width?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Ink at low alpha rather than pure black — a hard black scrim reads
          bruised over the warm paper surfaces. */}
      <div
        className="absolute inset-0 bg-[#1b1a18]/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          "relative bg-surface-2 border border-border-default rounded-lg shadow-modal",
          "w-full flex flex-col max-h-[85vh] outline-none animate-scale-in",
          width
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-text-primary truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11.5px] text-text-tertiary mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mt-1 -mr-1 p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        <div className={cx("px-5 overflow-y-auto", bodyClassName ?? "pb-5")}>{children}</div>

        {footer && (
          <div className="border-t border-border-subtle px-5 py-3.5 flex items-center justify-between gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
