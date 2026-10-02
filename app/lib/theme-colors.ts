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
  /** Selection frame + transform anchor stroke. Mirrors `--selection`. */
  selection: string;
  /** Transform anchor fill — white square handles in both themes. */
  anchorFill: string;
  marqueeFill: string;
  marqueeStroke: string;
  /** Snap guides. Deliberately not the selection blue — it has to read
   *  against both the cobalt selection frame and the warm paper. */
  snapGuide: string;
  /** Artboard drop shadow. Mirrors `--shadow-canvas`. */
  artboardShadow: string;
  artboardShadowBlur: number;
  artboardShadowOffsetY: number;
}

export const CANVAS_COLORS: Record<ResolvedTheme, CanvasColors> = {
  light: {
    selection: "#2f4bff",
    anchorFill: "#ffffff",
    marqueeFill: "rgba(47, 75, 255, 0.12)",
    marqueeStroke: "#2f4bff",
    snapGuide: "#FF00B8",
    // --sh-canvas: 0 18px 44px -8px rgb(60 40 10 / .22). Konva has no spread,
    // so the blur is trimmed to approximate the negative spread.
    artboardShadow: "rgba(60,40,10,0.22)",
    artboardShadowBlur: 36,
    artboardShadowOffsetY: 18,
  },
  dark: {
    selection: "#7b8cff",
    anchorFill: "#ffffff",
    marqueeFill: "rgba(123, 140, 255, 0.16)",
    marqueeStroke: "#7b8cff",
    snapGuide: "#FF00B8",
    artboardShadow: "rgba(0,0,0,0.65)",
    artboardShadowBlur: 50,
    artboardShadowOffsetY: 30,
  },
};

/** The canvas palette for the theme currently applied. */
export function useCanvasColors(): CanvasColors {
  return CANVAS_COLORS[useThemeStore((s) => s.resolved)];
}
