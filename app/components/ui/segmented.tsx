"use client";

import { cx } from "./cx";

export interface SegmentedOption<T extends string> {
  value: T;
  /** Text or a glyph. */
  label: React.ReactNode;
  /** Accessible name when `label` is an icon. */
  title?: string;
}

/**
 * Segmented control: a recessed track with the active item raised out of it.
 * Used by the topbar tool group, text alignment, export formats and the theme
 * picker.
 */
export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="group"
      className={cx(
        "flex items-center bg-surface-4 rounded-md p-[3px] gap-[2px]",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            title={opt.title}
            aria-label={opt.title}
            aria-pressed={active}
            className={cx(
              "flex-1 flex items-center justify-center rounded-sm transition-colors duration-150 ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              size === "sm" ? "px-2 py-1 text-[11px]" : "px-2.5 py-1 text-[11.5px]",
              active
                ? "bg-surface-2 text-text-primary font-medium shadow-raise"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
