import { useThemeStore, type ResolvedTheme } from "../store/theme-store";

/**
 * Canvas chrome colours for Konva.
 *
 * Konva draws to a canvas, so it cannot use Tailwind classes or CSS variables —
 * it needs concrete strings and numbers at render time. These values are
 * therefore duplicated from the token block in `app/globals.css`; keep the two
 * in step. (Three of them have no CSS counterpart at all: `snapGuide` is a
 * categorical that must stay legible on the paper in both themes, and the
 * artboard shadow needs numeric blur/offset rather than a CSS shadow string.)
 *
 * Driving this from zustand state rather than reading `getComputedStyle` means
 * a theme flip re-renders the Konva nodes for free — no MutationObserver, no
 * style recalc inside a component that redraws on every drag frame.
 */
interface CanvasColors {
  /** Selection frame + transform anchor stroke. Mirrors `--accent`. */
  selection: string;
  /** Transform anchor fill. Mirrors `--surface-2`. */
  anchorFill: string;
  marqueeFill: string;
  marqueeStroke: string;
  /** Snap guides. Deliberately not the accent — it has to read against both
   *  the iris selection frame and the warm paper. */
  snapGuide: string;
  /** Artboard drop shadow. Mirrors `--shadow-canvas`. */
  artboardShadow: string;
  artboardShadowBlur: number;
  artboardShadowOffsetY: number;
}

export const CANVAS_COLORS: Record<ResolvedTheme, CanvasColors> = {
  light: {
    selection: "#5b5bd6",
    anchorFill: "#ffffff",
    marqueeFill: "rgba(91, 91, 214, 0.12)",
    marqueeStroke: "#5b5bd6",
    snapGuide: "#FF00B8",
    artboardShadow: "rgba(0,0,0,0.22)",
    artboardShadowBlur: 50,
    artboardShadowOffsetY: 18,
  },
  dark: {
    selection: "#8b8bf5",
    anchorFill: "#1c1c20",
    marqueeFill: "rgba(139, 139, 245, 0.12)",
    marqueeStroke: "#8b8bf5",
    snapGuide: "#FF00B8",
    artboardShadow: "rgba(0,0,0,0.7)",
    artboardShadowBlur: 60,
    artboardShadowOffsetY: 24,
  },
};

/** The canvas palette for the theme currently applied. */
export function useCanvasColors(): CanvasColors {
  return CANVAS_COLORS[useThemeStore((s) => s.resolved)];
}
