"use client";

import {
  TemplatesIcon,
  UploadIcon,
  TextIcon,
  ShapesIcon,
  AssetsIcon,
  OverlaysIcon,
  SparkleIcon,
} from "./icons";
import IconButton from "../ui/icon-button";
import { IS_DESKTOP } from "../../lib/platform";

/** Tools that open the contextual panel. AI is deliberately not one of them —
 *  it lives in the floating bar over the canvas. */
export type SidebarTool =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "assets"
  | "overlays";

const TOOLS: { id: SidebarTool; icon: typeof TemplatesIcon; label: string }[] = [
  { id: "templates", icon: TemplatesIcon, label: "Templates" },
  { id: "uploads", icon: UploadIcon, label: "Uploads" },
  { id: "text", icon: TextIcon, label: "Text" },
  { id: "shapes", icon: ShapesIcon, label: "Shapes" },
  { id: "assets", icon: AssetsIcon, label: "Assets" },
  { id: "overlays", icon: OverlaysIcon, label: "Overlays" },
];

export default function LeftSidebar({
  activeTool,
  onToolChange,
  onFocusAi,
}: {
  activeTool: SidebarTool | null;
  onToolChange: (tool: SidebarTool | null) => void;
  onFocusAi: () => void;
}) {
  return (
    <aside className="w-[56px] bg-surface-1 border-r border-border-subtle flex flex-col items-center py-3 gap-1 shrink-0 z-30">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        return (
          <IconButton
            key={tool.id}
            label={tool.label}
            size="rail"
            tooltipSide="right"
            active={isActive}
            onClick={() => onToolChange(isActive ? null : tool.id)}
          >
            <Icon className="w-[18px] h-[18px]" />
          </IconButton>
        );
      })}

      {/* AI is an action, not a panel — separated and tinted rather than filled,
          so it never competes with the active tool for the accent. Absent from
          the desktop build, where generation has no server to run on. */}
      {!IS_DESKTOP && (
        <>
          <div className="w-6 h-px bg-border-subtle my-2" />
          <IconButton
            label="Generate with AI"
            size="rail"
            variant="tint"
            tooltipSide="right"
            onClick={onFocusAi}
          >
            <SparkleIcon className="w-[18px] h-[18px]" />
          </IconButton>
        </>
      )}
    </aside>
  );
}
