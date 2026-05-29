"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { useClipboardEvents } from "../../hooks/use-clipboard-events";
import { useAutosave } from "../../hooks/use-autosave";
import { useProjectLoader } from "../../hooks/use-project-loader";
import Topbar from "./topbar";
import LeftSidebar from "./left-sidebar";
import LeftPanel from "./left-panel";
import CanvasArea from "./canvas-area";
import RightPanel from "./right-panel";
import FontLoader from "./font-loader";
import ProjectsModal from "./projects-modal";
import ShortcutsModal from "./shortcuts-modal";

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
  const [showProjects, setShowProjects] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const ready = useProjectLoader();
  useKeyboardShortcuts();
  useClipboardEvents();
  useAutosave();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-text-ghost">Loading project...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <FontLoader />
      <Topbar
        stageRef={stageRef}
        onOpenProjects={() => setShowProjects(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar activeTool={activeTool} onToolChange={setActiveTool} />
        <LeftPanel activePanel={activeTool} />
        <CanvasArea stageRef={stageRef} />
        <RightPanel />
      </div>
      {showProjects && <ProjectsModal onClose={() => setShowProjects(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
