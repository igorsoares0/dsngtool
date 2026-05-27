"use client";

import { useState } from "react";
import Topbar from "./topbar";
import LeftSidebar from "./left-sidebar";
import LeftPanel from "./left-panel";
import CanvasArea from "./canvas-area";
import RightPanel from "./right-panel";

type SidebarTool =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "images"
  | "assets"
  | "overlays";

export default function EditorLayout() {
  const [activeTool, setActiveTool] = useState<SidebarTool | null>(null);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar activeTool={activeTool} onToolChange={setActiveTool} />
        <LeftPanel activePanel={activeTool} />
        <CanvasArea />
        <RightPanel />
      </div>
    </div>
  );
}
