"use client";

import { useState } from "react";
import { cx } from "./cx";

export type IconButtonVariant = "ghost" | "accent" | "tint" | "danger" | "raised";
export type IconButtonSize = "sm" | "md" | "rail" | "toolbar";

/** The state matrix from the design system, in one place:
 *  rest = text-secondary / no fill · hover = surface-3 + text-primary ·
 *  active = ink fill (surface-inverse) — never the accent, which is reserved
 *  for primary CTAs · focus = 2px selection ring, offset 2px ·
 *  disabled = opacity only, no colour change. */
const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-3",
  accent: "bg-accent text-accent-fg hover:bg-accent-hover",
  /** AI only. */
  tint: "bg-ai text-ai-fg hover:brightness-95",
  danger: "text-text-secondary hover:text-danger hover:bg-danger-tint",
  /** Pressed / toggled-on state: an ink fill. */
  raised: "bg-surface-inverse text-text-inverse",
};

const SIZES: Record<IconButtonSize, string> = {
  sm: "w-[26px] h-[26px]",
  md: "w-7 h-7",
  rail: "w-[38px] h-[38px]",
  /** The topbar tool cell (select / hand / undo / redo). */
  toolbar: "w-8 h-[30px]",
};

const TOOLTIP_SIDE = {
  right: "left-full ml-2 top-1/2 -translate-y-1/2",
  bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
} as const;

export default function IconButton({
  label,
  onClick,
  variant = "ghost",
  size = "md",
  active = false,
  disabled = false,
  tooltip = true,
  tooltipSide = "bottom",
  className,
  children,
  ...rest
}: {
  /** Accessible name. Also the tooltip text — every icon-only control needs one. */
  label: string;
  onClick?: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  active?: boolean;
  disabled?: boolean;
  tooltip?: boolean;
  tooltipSide?: keyof typeof TOOLTIP_SIDE;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "children">) {
  const [hovered, setHovered] = useState(false);
  const effective: IconButtonVariant = active && variant === "ghost" ? "raised" : variant;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active || undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onBlur={() => setHovered(false)}
        className={cx(
          "flex items-center justify-center shrink-0 transition-colors duration-150 ease-standard",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
          "disabled:opacity-35 disabled:pointer-events-none",
          SIZES[size],
          VARIANTS[effective],
          className
        )}
        {...rest}
      >
        {children}
      </button>

      {tooltip && hovered && !disabled && (
        <div
          role="tooltip"
          className={cx(
            "absolute z-50 pointer-events-none whitespace-nowrap animate-fade-in",
            "bg-surface-inverse text-text-inverse text-[11px] font-medium px-2 py-1 rounded-float shadow-pop",
            TOOLTIP_SIDE[tooltipSide]
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}
