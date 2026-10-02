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
import AiBar from "./ai-bar";
import PageStrip from "./page-strip";
import StatusBar from "./status-bar";
import RightPanel from "./right-panel";
import FontLoader from "./font-loader";
import ProjectsModal from "./projects-modal";
import ShortcutsModal from "./shortcuts-modal";
import UpgradeModal from "./upgrade-modal";
import ExportModal from "./export-modal";
import Toaster from "./toaster";
import IosInstallHint from "./ios-install-hint";

/** Desktop opens with Templates showing (as the mock does); below xl the panel
 *  is an overlay, so it starts collapsed there. */
function initialTool(): SidebarTool | null {
  if (typeof window === "undefined") return null;
  return window.matchMedia("(min-width: 1280px)").matches ? "templates" : null;
}

export default function EditorLayout() {
  const [activeTool, setActiveTool] = useState<SidebarTool | null>(initialTool);
  const [showProjects, setShowProjects] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showExport, setShowExport] = useState(false);
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
      // ⌘E / Ctrl+E opens Export.
      if ((e.metaKey || e.ctrlKey) && e.code === "KeyE") {
        e.preventDefault();
        setShowExport(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-0">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
          <span className="font-mono text-[10.5px] uppercase text-text-tertiary">Loading project…</span>
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
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <LeftSidebar activeTool={activeTool} onToolChange={setActiveTool} />
        <LeftPanel activePanel={activeTool} onClose={() => setActiveTool(null)} />
        {/* Below lg the inspector is a 45vh bottom sheet; the padding keeps the
            brief bar and page strip above it. */}
        <div className="flex-1 min-w-0 flex flex-col pb-[45vh] lg:pb-0">
          <CanvasArea stageRef={stageRef} />
          <AiBar />
          <PageStrip />
        </div>
        <RightPanel />
      </div>
      <StatusBar onOpenShortcuts={() => setShowShortcuts(true)} />
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
