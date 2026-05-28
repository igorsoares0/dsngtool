"use client";

import { useState, useCallback, useRef } from "react";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import { CANVAS_FORMATS } from "../../types/editor";
import { db } from "../../lib/db";
import {
  downloadProjectFile,
  readProjectFile,
  FILE_EXTENSION,
  ImportError,
} from "../../lib/project-io";
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
  UploadIcon,
  KeyboardIcon,
} from "./icons";

export default function Topbar({
  stageRef,
  onOpenProjects,
  onOpenShortcuts,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  onOpenProjects: () => void;
  onOpenShortcuts: () => void;
}) {
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const setFormat = useEditorStore((s) => s.setFormat);
  const setZoom = useEditorStore((s) => s.setZoom);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);

  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [exportQuality, setExportQuality] = useState(90);
  const [transparentBg, setTransparentBg] = useState(false);
  const [activeTool, setActiveTool] = useState<"cursor" | "hand">("cursor");
  const [isEditingName, setIsEditingName] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    const s = useEditorStore.getState();
    try {
      await db.projects.put({
        id: s.projectId,
        name: s.projectName,
        elements: s.elements,
        backgroundColor: s.backgroundColor,
        backgroundGradient: s.backgroundGradient,
        format: s.format,
        createdAt: (await db.projects.get(s.projectId))?.createdAt ?? new Date(),
        updatedAt: new Date(),
      });
      s.markSaved();
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    } catch {
      // silent
    }
  }, []);

  const handleExport = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const scale = zoom / 100;
    const containerWidth = stage.width();
    const containerHeight = stage.height();
    const offsetX = (containerWidth - format.width * scale) / 2;
    const offsetY = (containerHeight - format.height * scale) / 2;

    const bgLayer = stage.getLayers()[0];
    const bgRect = bgLayer?.findOne("Rect");
    if (transparentBg && bgRect) bgRect.hide();

    const mimeType = exportFormat === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = stage.toDataURL({
      x: offsetX,
      y: offsetY,
      width: format.width * scale,
      height: format.height * scale,
      pixelRatio: format.width / (format.width * scale),
      mimeType,
      quality: exportFormat === "jpeg" ? exportQuality / 100 : undefined,
    });

    if (transparentBg && bgRect) bgRect.show();

    const link = document.createElement("a");
    link.download = `${projectName || "design"}.${exportFormat}`;
    link.href = dataUrl;
    link.click();
    setShowExportMenu(false);
  }, [stageRef, zoom, format, projectName, exportFormat, exportQuality, transparentBg]);

  const handleExportProjectFile = useCallback(() => {
    const s = useEditorStore.getState();
    downloadProjectFile({
      name: s.projectName,
      format: s.format,
      backgroundColor: s.backgroundColor,
      backgroundGradient: s.backgroundGradient,
      elements: s.elements,
    });
    setShowExportMenu(false);
  }, []);

  const handleImportClick = useCallback(() => {
    setImportError(null);
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const imported = await readProjectFile(file);
      useEditorStore.getState().loadProject({
        id: `proj_${Date.now()}`,
        name: imported.name,
        elements: imported.elements,
        backgroundColor: imported.backgroundColor,
        backgroundGradient: imported.backgroundGradient,
        format: imported.format,
      });
    } catch (err) {
      const msg = err instanceof ImportError ? err.message : "Could not import file";
      setImportError(msg);
      setTimeout(() => setImportError(null), 4000);
    }
  }, []);

  return (
    <header className="h-12 bg-surface-1 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 relative z-50">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="flex items-center gap-2.5">
          <button onClick={onOpenProjects} className="hover:opacity-80 transition-opacity" title="My Projects">
            <LogoIcon className="w-6 h-6" />
          </button>
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
        {importError && (
          <span className="text-[10px] text-red-400 animate-fade-in" title={importError}>
            Import failed
          </span>
        )}
        {!importError && saveFlash && (
          <span className="text-[10px] text-accent-green animate-fade-in">Saved</span>
        )}
        {!importError && !saveFlash && lastSavedAt && (
          <span className="text-[10px] text-text-ghost">Auto-saved</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={`.${FILE_EXTENSION},application/json`}
          onChange={handleImportFile}
          className="hidden"
        />
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded-md transition-all"
        >
          <KeyboardIcon />
        </button>
        <button
          onClick={handleImportClick}
          title={`Import .${FILE_EXTENSION} file`}
          className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded-md transition-all"
        >
          <UploadIcon />
        </button>
        <button
          onClick={handleSave}
          className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded-md transition-all"
        >
          <SaveIcon />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 bg-accent-green hover:bg-accent-green-hover text-surface-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export
            <ChevronDownIcon className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <div className="absolute top-full mt-1 right-0 bg-surface-2 border border-border-default rounded-lg p-3 min-w-[220px] shadow-2xl animate-scale-in space-y-3 z-50">
              <div>
                <span className="text-[10px] text-text-ghost uppercase block mb-1">Format</span>
                <div className="flex bg-surface-3 rounded-md p-0.5 border border-border-subtle">
                  {(["png", "jpeg"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setExportFormat(f)}
                      className={`flex-1 py-1.5 text-[11px] rounded uppercase transition-all ${
                        exportFormat === f
                          ? "bg-surface-4 text-text-primary"
                          : "text-text-ghost hover:text-text-tertiary"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {exportFormat === "jpeg" && (
                <div>
                  <span className="text-[10px] text-text-ghost uppercase block mb-1">
                    Quality — {exportQuality}%
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={exportQuality}
                    onChange={(e) => setExportQuality(Number(e.target.value))}
                    className="w-full accent-accent-green h-1"
                  />
                </div>
              )}
              {exportFormat === "png" && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transparentBg}
                    onChange={(e) => setTransparentBg(e.target.checked)}
                    className="accent-accent-green w-3.5 h-3.5 rounded"
                  />
                  <span className="text-xs text-text-secondary">Transparent background</span>
                </label>
              )}
              <div className="text-[10px] text-text-ghost">
                {format.width} × {format.height}px
              </div>
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-1.5 bg-accent-green hover:bg-accent-green-hover text-surface-0 text-xs font-semibold py-2 rounded-lg transition-all"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Download {exportFormat.toUpperCase()}
              </button>
              <div className="border-t border-border-subtle pt-2">
                <button
                  onClick={handleExportProjectFile}
                  className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 px-2 py-1.5 rounded transition-all"
                  title="Editable project file"
                >
                  <span>Save project file</span>
                  <span className="text-[10px] text-text-ghost uppercase">.{FILE_EXTENSION}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
