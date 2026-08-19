"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useEditorStore } from "../../store/editor-store";
import { useEntitlementStore } from "../../store/entitlement-store";
import { CANVAS_FORMATS } from "../../types/editor";
import { db } from "../../lib/db";
import { toast } from "../../store/toast-store";
import { useInstallPrompt } from "../../hooks/use-install-prompt";
import AccountMenu from "./account-menu";
import IconButton from "../ui/icon-button";
import { cx } from "../ui/cx";
import {
  readProjectFile,
  FILE_EXTENSION,
  ImportError,
} from "../../lib/project-io";
import {
  UndoIcon,
  RedoIcon,
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

/** How long after a save the "Saved" chip stays up. */
const SAVED_CHIP_MS = 4000;

export default function Topbar({
  onOpenProjects,
  onOpenShortcuts,
  onOpenExport,
}: {
  onOpenProjects: () => void;
  onOpenShortcuts: () => void;
  onOpenExport: () => void;
}) {
  const format = useEditorStore((s) => s.format);
  const setFormat = useEditorStore((s) => s.setFormat);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const projectName = useEditorStore((s) => s.projectName);
  const setProjectName = useEditorStore((s) => s.setProjectName);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const isPro = useEntitlementStore((s) => s.pro);
  const openLicense = useEntitlementStore((s) => s.openModal);
  const { canInstall, promptInstall } = useInstallPrompt();

  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customW, setCustomW] = useState<string>(String(format.width));
  const [customH, setCustomH] = useState<string>(String(format.height));
  const [, tick] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomW(String(format.width));
    setCustomH(String(format.height));
  }, [format.width, format.height]);

  // The chip is a moment of reassurance, not a permanent badge. Derived from
  // `lastSavedAt` rather than held in state — the effect only schedules the
  // re-render that retires it.
  const savedRecently =
    lastSavedAt !== null && Date.now() - lastSavedAt < SAVED_CHIP_MS;

  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setTimeout(() => tick((n) => n + 1), SAVED_CHIP_MS);
    return () => clearTimeout(t);
  }, [lastSavedAt]);

  // Close any open dropdown on outside click or Escape.
  useEffect(() => {
    if (!showFormatMenu && !showFileMenu) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (formatMenuRef.current?.contains(t)) return;
      if (fileMenuRef.current?.contains(t)) return;
      setShowFormatMenu(false);
      setShowFileMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowFormatMenu(false);
        setShowFileMenu(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [showFormatMenu, showFileMenu]);

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
        pages: s.pages,
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

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const imported = await readProjectFile(file);
      useEditorStore.getState().loadProject({
        id: `proj_${Date.now()}`,
        name: imported.name,
        pages: imported.pages,
        format: imported.format,
      });
      toast.success(`Imported "${imported.name}"`);
    } catch (err) {
      const msg = err instanceof ImportError ? err.message : "Could not import file";
      toast.error(msg);
    }
  }, []);

  const menuItem =
    "w-full flex items-center gap-2.5 px-3 py-2 text-[11.5px] text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors duration-150 ease-standard";

  return (
    <header className="h-[52px] bg-surface-1 border-b border-border-subtle flex items-center justify-between px-3 shrink-0 relative z-50">
      {/* ---- Left: identity ---- */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          onClick={onOpenProjects}
          title="My projects"
          aria-label="My projects"
          className="w-[26px] h-[26px] rounded-md bg-accent text-accent-fg text-[12px] font-semibold flex items-center justify-center shrink-0 hover:bg-accent-hover transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          M
        </button>

        {isEditingName ? (
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
            autoFocus
            className="bg-surface-3 text-[13px] font-semibold text-text-primary px-2 py-0.5 rounded-md outline-none border border-border-default focus:border-accent w-36"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            aria-label={`Rename project (current: ${projectName})`}
            className="text-[13px] font-semibold text-text-primary truncate max-w-[180px] hover:text-accent transition-colors duration-150 ease-standard"
          >
            {projectName}
          </button>
        )}

        <span className="text-[11px] text-text-tertiary truncate hidden sm:block">
          {format.label}
        </span>

        {savedRecently && (
          <span className="text-[10px] font-medium font-mono text-success bg-success/10 rounded-full px-2 py-[3px] shrink-0 animate-fade-in">
            Saved
          </span>
        )}
      </div>

      {/* ---- Centre: canvas controls ---- */}
      <div className="hidden md:flex items-center gap-[3px] bg-surface-4 rounded-[9px] p-[3px] shrink-0">
        {/* Format selector — the raised card in the group */}
        <div className="relative" ref={formatMenuRef}>
          <button
            onClick={() => setShowFormatMenu((v) => !v)}
            aria-label={`Canvas size: ${format.width} by ${format.height}. Change`}
            aria-haspopup="menu"
            aria-expanded={showFormatMenu}
            className="flex items-center gap-1.5 bg-surface-2 text-text-primary text-[11.5px] font-medium px-2.5 h-[26px] rounded-[7px] shadow-raise hover:bg-surface-3 transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="font-mono tabular-nums">
              {format.width} × {format.height}
            </span>
            <ChevronDownIcon className="w-3 h-3 text-text-tertiary" />
          </button>
          {showFormatMenu && (
            <div className="absolute top-full mt-2 left-0 bg-surface-2 border border-border-default rounded-lg py-1 min-w-[220px] shadow-pop animate-scale-in">
              {CANVAS_FORMATS.map((fmt) => (
                <button
                  key={fmt.label}
                  onClick={() => {
                    setFormat(fmt);
                    setShowFormatMenu(false);
                  }}
                  className={cx(
                    "w-full text-left px-3 py-2 text-[11.5px] flex justify-between items-center gap-4 hover:bg-surface-4 transition-colors duration-150 ease-standard",
                    fmt.label === format.label
                      ? "text-accent font-medium"
                      : "text-text-secondary"
                  )}
                >
                  <span>{fmt.label}</span>
                  <span className="text-text-ghost font-mono tabular-nums">
                    {fmt.width} × {fmt.height}
                  </span>
                </button>
              ))}
              <div className="border-t border-border-subtle mt-1 pt-2 px-3 pb-2 space-y-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-ghost block">
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
                    className="w-full min-w-0 bg-surface-3 border border-border-subtle text-[11.5px] font-mono tabular-nums text-text-primary px-2 py-1 rounded-md outline-none focus:border-accent transition-colors"
                    placeholder="W"
                    aria-label="Custom width"
                  />
                  <span className="text-text-ghost text-[11.5px]">×</span>
                  <input
                    type="number"
                    min={50}
                    max={8000}
                    value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyCustomFormat()}
                    className="w-full min-w-0 bg-surface-3 border border-border-subtle text-[11.5px] font-mono tabular-nums text-text-primary px-2 py-1 rounded-md outline-none focus:border-accent transition-colors"
                    placeholder="H"
                    aria-label="Custom height"
                  />
                  <button
                    onClick={applyCustomFormat}
                    className="text-[10px] uppercase font-semibold bg-accent hover:bg-accent-hover text-accent-fg px-2.5 py-1 rounded-md transition-colors duration-150 ease-standard shrink-0"
                  >
                    Set
                  </button>
                </div>
                <span className="text-[11px] text-text-ghost block font-mono tabular-nums">
                  50 – 8000px
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-4 bg-border-default mx-[3px]" />

        <ToolToggle
          label="Select"
          active={activeTool === "cursor"}
          onClick={() => setActiveTool("cursor")}
        >
          <CursorIcon className="w-4 h-4" />
        </ToolToggle>
        <ToolToggle
          label="Hand (pan)"
          active={activeTool === "hand"}
          onClick={() => setActiveTool("hand")}
        >
          <HandIcon className="w-4 h-4" />
        </ToolToggle>

        <div className="w-px h-4 bg-border-default mx-[3px]" />

        <ToolToggle label="Undo" onClick={undo} disabled={past.length === 0}>
          <UndoIcon className="w-4 h-4" />
        </ToolToggle>
        <ToolToggle label="Redo" onClick={redo} disabled={future.length === 0}>
          <RedoIcon className="w-4 h-4" />
        </ToolToggle>
      </div>

      {/* ---- Right: actions ---- */}
      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
        <input
          ref={fileInputRef}
          type="file"
          accept={`.${FILE_EXTENSION},application/json`}
          onChange={handleImportFile}
          className="hidden"
        />

        {/* File menu — also the home for the install and shortcuts actions,
            which the redesigned bar has no room to surface directly. */}
        <div className="relative" ref={fileMenuRef}>
          <button
            onClick={() => setShowFileMenu((v) => !v)}
            aria-label="File and project options"
            aria-haspopup="menu"
            aria-expanded={showFileMenu}
            className="flex items-center gap-1.5 bg-surface-2 border border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-4 text-[11.5px] font-medium px-2.5 py-1.5 rounded-md transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <FolderIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">File</span>
          </button>
          {showFileMenu && (
            <div className="absolute top-full mt-2 right-0 bg-surface-2 border border-border-default rounded-lg py-1 min-w-[220px] shadow-pop animate-scale-in z-50">
              <button
                onClick={() => {
                  handleSave();
                  setShowFileMenu(false);
                }}
                className={menuItem}
              >
                <SaveIcon className="w-3.5 h-3.5 text-text-tertiary" />
                Save to browser
              </button>
              <button
                onClick={() => {
                  onOpenProjects();
                  setShowFileMenu(false);
                }}
                className={menuItem}
              >
                <TemplatesIcon className="w-3.5 h-3.5 text-text-tertiary" />
                My projects…
              </button>

              <div className="border-t border-border-subtle my-1" />
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-ghost px-3 py-1 block">
                Project file
              </span>
              <button
                onClick={() => {
                  onOpenExport();
                  setShowFileMenu(false);
                }}
                className={cx(menuItem, "justify-between")}
              >
                <span className="flex items-center gap-2.5">
                  <DownloadIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  Download project
                </span>
                <span className="text-[10px] text-text-ghost uppercase font-mono">
                  .{FILE_EXTENSION}
                </span>
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowFileMenu(false);
                }}
                className={cx(menuItem, "justify-between")}
              >
                <span className="flex items-center gap-2.5">
                  <UploadIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  Import project
                </span>
                <span className="text-[10px] text-text-ghost uppercase font-mono">
                  .{FILE_EXTENSION}
                </span>
              </button>

              <div className="border-t border-border-subtle my-1" />
              <button
                onClick={() => {
                  onOpenShortcuts();
                  setShowFileMenu(false);
                }}
                className={cx(menuItem, "justify-between")}
              >
                <span className="flex items-center gap-2.5">
                  <KeyboardIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  Keyboard shortcuts
                </span>
                <kbd className="text-[10px] text-text-ghost font-mono">?</kbd>
              </button>
              {canInstall && (
                <button
                  onClick={() => {
                    promptInstall();
                    setShowFileMenu(false);
                  }}
                  className={menuItem}
                >
                  <InstallIcon className="w-3.5 h-3.5 text-text-tertiary" />
                  Install as an app
                </button>
              )}
            </div>
          )}
        </div>

        {!isPro && (
          <button
            onClick={() => openLicense()}
            className="hidden sm:flex items-center gap-1.5 bg-accent-tint text-accent-tint-fg hover:bg-accent/20 text-[11.5px] font-medium px-2.5 py-1.5 rounded-md transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <LockIcon className="w-3.5 h-3.5" />
            Upgrade
          </button>
        )}

        {/* The one primary action on the screen. */}
        <button
          onClick={onOpenExport}
          aria-label="Export"
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-[11.5px] font-semibold px-3 py-1.5 rounded-md shadow-[0_1px_2px_rgb(91_91_214/.4)] transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <DownloadIcon className="w-3.5 h-3.5" />
          Export
        </button>

        <AccountMenu />
      </div>
    </header>
  );
}

/** A 28×26 control inside the centre group. */
function ToolToggle({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <IconButton
      label={label}
      onClick={onClick}
      disabled={disabled}
      active={active}
      variant={active ? "raised" : "ghost"}
      size="toolbar"
    >
      {children}
    </IconButton>
  );
}
