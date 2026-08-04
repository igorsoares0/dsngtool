"use client";

import { useState } from "react";
import { cx } from "./cx";

export type IconButtonVariant = "ghost" | "accent" | "tint" | "danger" | "raised";
export type IconButtonSize = "sm" | "md" | "rail" | "toolbar";

/** The state matrix from the design system, in one place:
 *  rest = text-secondary / no fill · hover = surface-4 + text-primary ·
 *  active = accent fill · focus = 2px accent ring, no glow ·
 *  disabled = opacity only, no colour change. */
const VARIANTS: Record<IconButtonVariant, string> = {
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-4",
  accent: "bg-accent text-accent-fg hover:bg-accent-hover",
  tint: "bg-accent-tint text-accent-tint-fg hover:bg-accent/20",
  danger: "text-text-secondary hover:text-danger hover:bg-danger-tint",
  /** Selected item inside a recessed group — lifted out rather than filled. */
  raised: "bg-surface-2 text-text-primary shadow-raise",
};

const SIZES: Record<IconButtonSize, string> = {
  sm: "w-[26px] h-[26px] rounded-md",
  md: "w-7 h-7 rounded-md",
  rail: "w-[38px] h-[38px] rounded-[10px]",
  /** Inside the topbar's centre group. */
  toolbar: "w-[28px] h-[26px] rounded-[7px]",
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
  const effective: IconButtonVariant = active && variant === "ghost" ? "accent" : variant;

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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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
            "bg-text-primary text-surface-2 text-[11px] font-medium px-2 py-1 rounded-md shadow-pop",
            TOOLTIP_SIDE[tooltipSide]
          )}
        >
          {label}
        </div>
      )}
    </div>
  );
}
