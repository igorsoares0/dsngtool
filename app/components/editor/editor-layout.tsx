"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { useKeyboardShortcuts } from "../../hooks/use-keyboard-shortcuts";
import { useClipboardEvents } from "../../hooks/use-clipboard-events";
import { useAutosave } from "../../hooks/use-autosave";
import { useProjectLoader } from "../../hooks/use-project-loader";
import { useEntitlement } from "../../hooks/use-entitlement";
import Topbar from "./topbar";
import LeftSidebar, { type SidebarTool } from "./left-sidebar";
import LeftPanel from "./left-panel";
import CanvasArea from "./canvas-area";
import RightPanel from "./right-panel";
import FontLoader from "./font-loader";
import ProjectsModal from "./projects-modal";
import ShortcutsModal from "./shortcuts-modal";
import UpgradeModal from "./upgrade-modal";
import ExportModal from "./export-modal";
import Toaster from "./toaster";
import IosInstallHint from "./ios-install-hint";

export default function EditorLayout() {
  const [activeTool, setActiveTool] = useState<SidebarTool | null>(null);
  const [showProjects, setShowProjects] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // Incremented by the rail's AI button; the AI bar focuses its input in response.
  const [aiFocusSignal, setAiFocusSignal] = useState(0);
  const stageRef = useRef<Konva.Stage>(null);
  const ready = useProjectLoader();
  useKeyboardShortcuts();
  useClipboardEvents();
  useAutosave();
  useEntitlement();

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
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-[11.5px] text-text-ghost">Loading project…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <FontLoader />
      <Topbar
        onOpenProjects={() => setShowProjects(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
        onOpenExport={() => setShowExport(true)}
      />
      <div className="flex flex-1 overflow-hidden relative">
        <LeftSidebar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onFocusAi={() => setAiFocusSignal((n) => n + 1)}
        />
        <LeftPanel activePanel={activeTool} onClose={() => setActiveTool(null)} />
        <CanvasArea stageRef={stageRef} aiFocusSignal={aiFocusSignal} />
        <RightPanel />
      </div>
      {showProjects && <ProjectsModal onClose={() => setShowProjects(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        stageRef={stageRef}
      />
      <UpgradeModal />
      <Toaster />
      <IosInstallHint />
    </div>
  );
}
