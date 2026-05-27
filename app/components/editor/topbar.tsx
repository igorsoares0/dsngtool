"use client";

import { useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import { CANVAS_FORMATS } from "../../types/editor";
import {
  LogoIcon,
  UndoIcon,
  RedoIcon,
  ZoomInIcon,
  ZoomOutIcon,
  DownloadIcon,
  SaveIcon,
  CursorIcon,
  HandIcon,
  ChevronDownIcon,
} from "./icons";

export default function Topbar({
  stageRef,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const setFormat = useEditorStore((s) => s.setFormat);
  const setZoom = useEditorStore((s) => s.setZoom);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);

  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [activeTool, setActiveTool] = useState<"cursor" | "hand">("cursor");
  const [projectName, setProjectName] = useState("Untitled");
  const [isEditingName, setIsEditingName] = useState(false);

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const scale = zoom / 100;
    const layers = stage.getLayers();
    const elementsLayer = layers[1];
    if (!elementsLayer) return;

    const containerWidth = stage.width();
    const containerHeight = stage.height();
    const offsetX = (containerWidth - format.width * scale) / 2;
    const offsetY = (containerHeight - format.height * scale) / 2;

    const dataUrl = stage.toDataURL({
      x: offsetX,
      y: offsetY,
      width: format.width * scale,
      height: format.height * scale,
      pixelRatio: format.width / (format.width * scale),
    });

    const link = document.createElement("a");
    link.download = `${projectName || "design"}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <header className="h-12 bg-surface-1 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 relative z-50">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="flex items-center gap-2.5">
          <LogoIcon className="w-6 h-6" />
          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
              autoFocus
              className="bg-surface-3 text-sm text-text-primary px-2 py-0.5 rounded outline-none border border-border-strong w-32 font-[family-name:var(--font-dm-sans)]"
            />
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm text-text-primary hover:text-white transition-colors font-medium font-[family-name:var(--font-dm-sans)]"
            >
              {projectName}
            </button>
          )}
        </div>
        <span className="text-text-ghost text-xs">/</span>
        <span className="text-text-tertiary text-xs">{format.label}</span>
      </div>

      {/* Center */}
      <div className="flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        {/* Format selector */}
        <div className="relative">
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3 px-2.5 py-1.5 rounded-md transition-all"
          >
            <span>{format.width} × {format.height}</span>
            <ChevronDownIcon />
          </button>
          {showFormatMenu && (
            <div className="absolute top-full mt-1 left-0 bg-surface-2 border border-border-default rounded-lg py-1 min-w-[180px] shadow-2xl animate-scale-in">
              {CANVAS_FORMATS.map((fmt) => (
                <button
                  key={fmt.label}
                  onClick={() => {
                    setFormat(fmt);
                    setShowFormatMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex justify-between items-center hover:bg-surface-3 transition-colors ${
                    fmt.label === format.label
                      ? "text-accent-green"
                      : "text-text-secondary"
                  }`}
                >
                  <span>{fmt.label}</span>
                  <span className="text-text-ghost">{fmt.width} × {fmt.height}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border-subtle mx-1.5" />

        <div className="flex items-center bg-surface-2 rounded-md p-0.5">
          <button
            onClick={() => setActiveTool("cursor")}
            className={`p-1.5 rounded transition-all ${
              activeTool === "cursor"
                ? "bg-surface-4 text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <CursorIcon />
          </button>
          <button
            onClick={() => setActiveTool("hand")}
            className={`p-1.5 rounded transition-all ${
              activeTool === "hand"
                ? "bg-surface-4 text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            <HandIcon />
          </button>
        </div>

        <div className="w-px h-5 bg-border-subtle mx-1.5" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={undo}
            disabled={past.length === 0}
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <UndoIcon />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RedoIcon />
          </button>
        </div>

        <div className="w-px h-5 bg-border-subtle mx-1.5" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setZoom(zoom - 10)}
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all"
          >
            <ZoomOutIcon />
          </button>
          <span className="text-xs text-text-secondary tabular-nums min-w-[40px] text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(zoom + 10)}
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all"
          >
            <ZoomInIcon />
          </button>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 min-w-[200px] justify-end">
        <button className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded-md transition-all">
          <SaveIcon />
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 bg-accent-green hover:bg-accent-green-hover text-surface-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          Export
        </button>
      </div>
    </header>
  );
}
