"use client";

import { useRef, useState } from "react";
import type Konva from "konva";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import Topbar from "./topbar";
import LeftSidebar from "./left-sidebar";
import LeftPanel from "./left-panel";
import CanvasArea from "./canvas-area";
import RightPanel from "./right-panel";
import FontLoader from "./font-loader";

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
  const stageRef = useRef<Konva.Stage>(null);
  useKeyboardShortcuts();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <FontLoader />
      <Topbar stageRef={stageRef} />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar activeTool={activeTool} onToolChange={setActiveTool} />
        <LeftPanel activePanel={activeTool} />
        <CanvasArea stageRef={stageRef} />
        <RightPanel />
      </div>
    </div>
  );
}
