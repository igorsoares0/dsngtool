"use client";

import { useState } from "react";
import {
  TemplatesIcon,
  UploadIcon,
  TextIcon,
  ShapesIcon,
  AssetsIcon,
  OverlaysIcon,
  ImageIcon,
} from "./icons";

type SidebarTool =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "images"
  | "assets"
  | "overlays";

const TOOLS: { id: SidebarTool; icon: typeof TemplatesIcon; label: string }[] = [
  { id: "templates", icon: TemplatesIcon, label: "Templates" },
  { id: "uploads", icon: UploadIcon, label: "Uploads" },
  { id: "text", icon: TextIcon, label: "Text" },
  { id: "images", icon: ImageIcon, label: "Images" },
  { id: "shapes", icon: ShapesIcon, label: "Shapes" },
  { id: "assets", icon: AssetsIcon, label: "Assets" },
  { id: "overlays", icon: OverlaysIcon, label: "Overlays" },
];

export default function LeftSidebar({
  activeTool,
  onToolChange,
}: {
  activeTool: SidebarTool | null;
  onToolChange: (tool: SidebarTool | null) => void;
}) {
  const [hoveredTool, setHoveredTool] = useState<SidebarTool | null>(null);

  return (
    <aside className="w-[52px] bg-surface-1 border-r border-border-subtle flex flex-col items-center py-3 gap-1 shrink-0">
      {TOOLS.map((tool, i) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;
        const isHovered = hoveredTool === tool.id;

        return (
          <div key={tool.id} className="relative">
            <button
              onClick={() => onToolChange(isActive ? null : tool.id)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              aria-label={tool.label}
              aria-pressed={isActive}
              title={tool.label}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-150 ${
                isActive
                  ? "bg-surface-4 text-accent-green shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary hover:bg-surface-2"
              }`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>

            {/* Tooltip */}
            {isHovered && !isActive && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-surface-3 text-text-primary text-[11px] px-2 py-1 rounded-md whitespace-nowrap shadow-lg border border-border-subtle animate-fade-in z-50 pointer-events-none">
                {tool.label}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex-1" />

      {/* Accent bottom icon */}
      <button aria-label="Favorites" title="Favorites" className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-pink/10 text-accent-pink hover:bg-accent-pink/20 transition-all">
        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>
    </aside>
  );
}
