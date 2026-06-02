"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import { useLicenseStore } from "../../store/license-store";
import { CANVAS_FORMATS } from "../../types/editor";
import { db } from "../../lib/db";
import { applyWatermark } from "../../lib/watermark";
import { toast } from "../../store/toast-store";
import { useInstallPrompt } from "../../hooks/use-install-prompt";
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
  FolderIcon,
  TemplatesIcon,
  LockIcon,
  InstallIcon,
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
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const isPro = useLicenseStore((s) => s.tier === "pro");
  const openLicense = useLicenseStore((s) => s.openModal);
  const { canInstall, promptInstall } = useInstallPrompt();

  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png");
  const [exportQuality, setExportQuality] = useState(90);
  const [transparentBg, setTransparentBg] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customW, setCustomW] = useState<string>(String(format.width));
  const [customH, setCustomH] = useState<string>(String(format.height));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomW(String(format.width));
    setCustomH(String(format.height));
  }, [format.width, format.height]);

  // Close any open dropdown on outside click or Escape.
  useEffect(() => {
    if (!showFormatMenu && !showFileMenu && !showExportMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (formatMenuRef.current?.contains(t)) return;
      if (fileMenuRef.current?.contains(t)) return;
      if (exportMenuRef.current?.contains(t)) return;
      setShowFormatMenu(false);
      setShowFileMenu(false);
      setShowExportMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowFormatMenu(false);
        setShowFileMenu(false);
        setShowExportMenu(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [showFormatMenu, showFileMenu, showExportMenu]);

  const applyCustomFormat = useCallback(() => {
    const w = Math.round(Number(customW));
    const h = Math.round(Number(customH));
    if (!Number.isFinite(w) || !Number.isFinite(h)) return;
    const clamp = (n: number) => Math.max(50, Math.min(8000, n));
    const cw = clamp(w);
    const ch = clamp(h);
    const matched = CANVAS_FORMATS.find((f) => f.width === cw && f.height === ch);
    setFormat(matched ?? { label: "Custom", width: cw, height: ch });
    setShowFormatMenu(false);
  }, [customW, customH, setFormat]);

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
      toast.success("Project saved");
    } catch {
      toast.error("Couldn't save project");
    }
  }, []);

  const handleExport = useCallback(async () => {
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
    let dataUrl = stage.toDataURL({
      x: offsetX,
      y: offsetY,
      width: format.width * scale,
      height: format.height * scale,
      pixelRatio: format.width / (format.width * scale),
      mimeType,
      quality: exportFormat === "jpeg" ? exportQuality / 100 : undefined,
    });

    if (transparentBg && bgRect) bgRect.show();

    // Free tier exports carry a watermark. Pro removes it.
    if (!isPro) {
      dataUrl = await applyWatermark(dataUrl, {
        width: format.width,
        height: format.height,
        mimeType,
        quality: exportFormat === "jpeg" ? exportQuality / 100 : undefined,
      });
    }

    const link = document.createElement("a");
    const fileName = `${projectName || "design"}.${exportFormat}`;
    link.download = fileName;
    link.href = dataUrl;
    link.click();
    setShowExportMenu(false);
    toast.success(`Exported ${fileName}`);
  }, [stageRef, zoom, format, projectName, exportFormat, exportQuality, transparentBg, isPro]);

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
    toast.success("Project file downloaded");
  }, []);

  const handleImportClick = useCallback(() => {
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
      toast.success(`Imported "${imported.name}"`);
    } catch (err) {
      const msg = err instanceof ImportError ? err.message : "Could not import file";
      toast.error(msg);
    }
  }, []);

  return (
    <header className="h-12 bg-surface-1 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 relative z-50">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="flex items-center gap-2.5">
          <button onClick={onOpenProjects} className="hover:opacity-80 transition-opacity" title="My Projects" aria-label="My projects">
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
              aria-label={`Rename project (current: ${projectName})`}
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
        <div className="relative" ref={formatMenuRef}>
          <button
            onClick={() => setShowFormatMenu(!showFormatMenu)}
            aria-label={`Canvas size: ${format.width} by ${format.height}. Change`}
            aria-haspopup="menu"
            aria-expanded={showFormatMenu}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3 px-2.5 py-1.5 rounded-md transition-all"
          >
            <span>{format.width} × {format.height}</span>
            <ChevronDownIcon />
          </button>
          {showFormatMenu && (
            <div className="absolute top-full mt-1 left-0 bg-surface-2 border border-border-default rounded-lg py-1 min-w-[220px] shadow-2xl animate-scale-in">
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
              <div className="border-t border-border-subtle mt-1 pt-2 px-3 pb-2 space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-text-ghost block">
                  Custom size
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={50}
                    max={8000}
                    value={customW}
                    onChange={(e) => setCustomW(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyCustomFormat()}
                    className="w-full min-w-0 bg-surface-3 border border-border-subtle text-xs text-text-primary px-2 py-1 rounded outline-none focus:border-accent-green/40 transition-colors tabular-nums"
                    placeholder="W"
                  />
                  <span className="text-text-ghost text-xs">×</span>
                  <input
                    type="number"
                    min={50}
                    max={8000}
                    value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyCustomFormat()}
                    className="w-full min-w-0 bg-surface-3 border border-border-subtle text-xs text-text-primary px-2 py-1 rounded outline-none focus:border-accent-green/40 transition-colors tabular-nums"
                    placeholder="H"
                  />
                  <button
                    onClick={applyCustomFormat}
                    className="text-[11px] uppercase font-semibold bg-accent-green hover:bg-accent-green-hover text-surface-0 px-2.5 py-1 rounded transition-all shrink-0"
                  >
                    Set
                  </button>
                </div>
                <span className="text-[11px] text-text-ghost block">50 – 8000px</span>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-border-subtle mx-1.5" />

        <div className="flex items-center bg-surface-2 rounded-md p-0.5">
          <button
            onClick={() => setActiveTool("cursor")}
            aria-label="Select tool"
            aria-pressed={activeTool === "cursor"}
            title="Select"
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
            aria-label="Hand tool (pan)"
            aria-pressed={activeTool === "hand"}
            title="Hand (pan)"
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
            aria-label="Undo"
            title="Undo"
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <UndoIcon />
          </button>
          <button
            onClick={redo}
            disabled={future.length === 0}
            aria-label="Redo"
            title="Redo"
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RedoIcon />
          </button>
        </div>

        <div className="w-px h-5 bg-border-subtle mx-1.5" />

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setZoom(zoom - 10)}
            aria-label="Zoom out"
            title="Zoom out"
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all"
          >
            <ZoomOutIcon />
          </button>
          <span
            className="text-xs text-text-secondary tabular-nums min-w-[40px] text-center"
            aria-label={`Zoom ${zoom} percent`}
            aria-live="polite"
          >
            {zoom}%
          </span>
          <button
            onClick={() => setZoom(zoom + 10)}
            aria-label="Zoom in"
            title="Zoom in"
            className="p-1.5 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded transition-all"
          >
            <ZoomInIcon />
          </button>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 min-w-[200px] justify-end">
        {lastSavedAt && (
          <span className="text-[11px] text-text-ghost">Auto-saved</span>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={`.${FILE_EXTENSION},application/json`}
          onChange={handleImportFile}
          className="hidden"
        />
        {canInstall && (
          <button
            onClick={promptInstall}
            title="Install Modo as an app"
            aria-label="Install app"
            className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
          >
            <InstallIcon className="w-3.5 h-3.5" />
            Install app
          </button>
        )}

        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
          className="p-2 text-text-tertiary hover:text-text-secondary hover:bg-surface-2 rounded-md transition-all"
        >
          <KeyboardIcon />
        </button>

        {/* File / project menu */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => {
              setShowExportMenu(false);
              setShowFileMenu((v) => !v);
            }}
            title="File"
            aria-label="File and project options"
            aria-haspopup="menu"
            aria-expanded={showFileMenu}
            className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary bg-surface-2 hover:bg-surface-3 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
          >
            <FolderIcon className="w-3.5 h-3.5" />
            File
            <ChevronDownIcon className="w-3 h-3" />
          </button>
          {showFileMenu && (
            <div className="absolute top-full mt-1 right-0 bg-surface-2 border border-border-default rounded-lg py-1 min-w-[220px] shadow-2xl animate-scale-in z-50">
              <button
                onClick={() => {
                  handleSave();
                  setShowFileMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <SaveIcon className="w-3.5 h-3.5 text-text-tertiary" />
                Save to browser
              </button>
              <button
                onClick={() => {
                  onOpenProjects();
                  setShowFileMenu(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <TemplatesIcon className="w-3.5 h-3.5 text-text-tertiary" />
                My projects…
              </button>
              <div className="border-t border-border-subtle my-1" />
              <span className="text-[11px] uppercase tracking-wider text-text-ghost px-3 py-1 block">
                Project file
              </span>
              <button
                onClick={() => {
                  handleExportProjectFile();
                  setShowFileMenu(false);
                }}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <DownloadIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  Download project
                </span>
                <span className="text-[11px] text-text-ghost uppercase">.{FILE_EXTENSION}</span>
              </button>
              <button
                onClick={() => {
                  handleImportClick();
                  setShowFileMenu(false);
                }}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <UploadIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  Import project
                </span>
                <span className="text-[11px] text-text-ghost uppercase">.{FILE_EXTENSION}</span>
              </button>
            </div>
          )}
        </div>

        {!isPro && (
          <button
            onClick={() => openLicense()}
            className="flex items-center gap-1.5 border border-accent-green/40 text-accent-green hover:bg-accent-green/10 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
          >
            <LockIcon className="w-3.5 h-3.5" />
            Upgrade
          </button>
        )}

        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => {
              setShowFileMenu(false);
              setShowExportMenu((v) => !v);
            }}
            aria-label="Export image"
            aria-haspopup="menu"
            aria-expanded={showExportMenu}
            className="flex items-center gap-1.5 bg-accent-green hover:bg-accent-green-hover text-surface-0 text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-all"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export
            <ChevronDownIcon className="w-3 h-3" />
          </button>
          {showExportMenu && (
            <div className="absolute top-full mt-1 right-0 bg-surface-2 border border-border-default rounded-lg p-3 min-w-[220px] shadow-2xl animate-scale-in space-y-3 z-50">
              <span className="text-[11px] font-semibold text-text-primary block">
                Export image
              </span>
              <div>
                <span className="text-[11px] text-text-ghost uppercase block mb-1">Format</span>
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
                  <span className="text-[11px] text-text-ghost uppercase block mb-1">
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
              <div className="text-[11px] text-text-ghost">
                {format.width} × {format.height}px
              </div>
              {!isPro && (
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    openLicense("Exports include a watermark on the free plan. Upgrade to remove it.");
                  }}
                  className="w-full flex items-center gap-1.5 text-[11px] text-accent-green hover:underline text-left"
                >
                  <LockIcon className="w-3 h-3" />
                  Exports include a watermark — upgrade to remove
                </button>
              )}
              <button
                onClick={handleExport}
                className="w-full flex items-center justify-center gap-1.5 bg-accent-green hover:bg-accent-green-hover text-surface-0 text-xs font-semibold py-2 rounded-lg transition-all"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                Download {exportFormat.toUpperCase()}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
