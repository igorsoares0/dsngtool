"use client";

import {
  TemplatesIcon,
  UploadIcon,
  TextIcon,
  ShapesIcon,
  AssetsIcon,
  OverlaysIcon,
} from "./icons";
import { cx } from "../ui/cx";

/** Tools that open the contextual panel. AI is deliberately not one of them —
 *  it lives in the docked brief bar under the canvas (⌘K). */
export type SidebarTool =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "assets"
  | "overlays";

/** Tile colours are spelled out (not built from the id) so Tailwind's scanner
 *  sees every class. The colour is identity only — the active state is the ink
 *  bar on the row's left edge, never a fill. */
export const TOOLS: {
  id: SidebarTool;
  icon: typeof TemplatesIcon;
  label: string;
  tile: string;
}[] = [
  { id: "templates", icon: TemplatesIcon, label: "Templates", tile: "bg-tool-templates text-tool-templates-fg" },
  { id: "uploads", icon: UploadIcon, label: "Uploads", tile: "bg-tool-uploads text-tool-uploads-fg" },
  { id: "text", icon: TextIcon, label: "Text", tile: "bg-tool-text text-tool-text-fg" },
  { id: "shapes", icon: ShapesIcon, label: "Shapes", tile: "bg-tool-shapes text-tool-shapes-fg" },
  { id: "assets", icon: AssetsIcon, label: "Assets", tile: "bg-tool-assets text-tool-assets-fg" },
  { id: "overlays", icon: OverlaysIcon, label: "Overlays", tile: "bg-tool-overlays text-tool-overlays-fg" },
];

export default function LeftSidebar({
  activeTool,
  onToolChange,
}: {
  activeTool: SidebarTool | null;
  onToolChange: (tool: SidebarTool | null) => void;
}) {
  return (
    <aside
      aria-label="Tools"
      className="w-[68px] bg-surface-1 border-r border-border-default flex flex-col shrink-0 z-30"
    >
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={isActive}
            // Clicking the open tool again collapses the panel down to the rail.
            onClick={() => onToolChange(isActive ? null : tool.id)}
            className={cx(
              "h-[66px] shrink-0 flex flex-col items-center justify-center gap-[5px] border-b border-border-default",
              "transition-colors duration-150 ease-standard hover:bg-surface-3",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
              isActive && "shadow-[inset_3px_0_0_var(--text-primary)]"
            )}
          >
            <span className={cx("w-[34px] h-[34px] flex items-center justify-center", tool.tile)}>
              <Icon className="w-[17px] h-[17px]" />
            </span>
            <span
              className={cx(
                "text-[10.5px] leading-none",
                isActive ? "font-bold text-text-primary" : "font-medium text-text-secondary"
              )}
            >
              {tool.label}
            </span>
          </button>
        );
      })}
    </aside>
  );
}
