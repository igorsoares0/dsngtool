/**
 * The two button recipes from the component-state table.
 *
 * Primary (accent): hover accent-hover · pressed adds an inset top shadow ·
 * focus 2px selection outline offset 2px · disabled surface-3 + tertiary text.
 * Archivo 800, expanded, uppercase.
 *
 * Secondary (hairline): hover ink border + surface-3 · pressed ink fill ·
 * focus as above · disabled dashed border.
 */
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-accent text-accent-fg font-extrabold font-expanded uppercase tracking-[0.02em] " +
  "hover:bg-accent-hover active:bg-accent-hover active:shadow-[inset_0_2px_0_rgb(0_0_0/0.25)] transition-colors duration-150 ease-standard " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection " +
  "disabled:bg-surface-3 disabled:text-text-tertiary disabled:shadow-none disabled:cursor-not-allowed";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 border border-border-default text-text-primary font-semibold " +
  "hover:border-text-primary hover:bg-surface-3 active:bg-surface-inverse active:text-text-inverse transition-colors duration-150 ease-standard " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection " +
  "disabled:border-dashed disabled:text-text-tertiary disabled:bg-transparent disabled:cursor-not-allowed";
