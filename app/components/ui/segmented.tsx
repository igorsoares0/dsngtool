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
 * Segmented control: a row of square cells split by hairlines, the active cell
 * filled with ink (surface-inverse). Used by text style/alignment, the theme
 * picker, GRID | LIST and the export formats.
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
        "flex items-stretch border border-border-default overflow-hidden divide-x divide-border-default",
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
              "flex-1 flex items-center justify-center transition-colors duration-150 ease-standard",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
              size === "sm" ? "h-[26px] px-2 text-[11.5px]" : "h-7 px-2.5 text-[12px]",
              active
                ? "bg-surface-inverse text-text-inverse font-semibold"
                : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
