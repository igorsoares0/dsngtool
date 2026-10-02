"use client";

import { FONTS_BY_CATEGORY, resolveFontFamily } from "../../lib/fonts";

/**
 * A font picker that looks like whatever you wrap it around: a native
 * <select> stretched transparently over `children`. Native keeps keyboard and
 * screen-reader behaviour for free, and every option renders in its own face.
 * Used by the selection toolbar's font chip and the inspector's font card.
 */
export default function FontSelect({
  value,
  onChange,
  className,
  children,
}: {
  value: string;
  onChange: (family: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      {children}
      <select
        value={value}
        aria-label="Font family"
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {FONTS_BY_CATEGORY.map((group) => (
          <optgroup key={group.category} label={group.label}>
            {group.fonts.map((f) => (
              <option
                key={f.family}
                value={f.family}
                style={{ fontFamily: resolveFontFamily(f.family) }}
              >
                {f.family}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
