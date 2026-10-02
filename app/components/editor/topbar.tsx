"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useEditorStore } from "../../store/editor-store";
import { useEntitlementStore } from "../../store/entitlement-store";
import { CANVAS_FORMATS } from "../../types/editor";
import { db } from "../../lib/db";
import { toast } from "../../store/toast-store";
import { useInstallPrompt } from "../../hooks/use-install-prompt";
import AccountMenu from "./account-menu";
import { useProjectNumber, formatProjectNumber } from "../../lib/project-number";
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
  TemplatesIcon,
  InstallIcon,
} from "./icons";

/** Shown next to "Try Pro". Keep in step with the Paddle price. */
const PRO_PRICE = "$10";

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
  const syncState = useEditorStore((s) => s.syncState);
  const projectId = useEditorStore((s) => s.projectId);
  const projectNumber = useProjectNumber(projectId);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomW(String(format.width));
    setCustomH(String(format.height));
  }, [format.width, format.height]);

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
    "w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors duration-150 ease-standard";

  const status =
    syncState === "syncing"
      ? { label: "saving…", tone: "text-text-tertiary", dot: "bg-text-tertiary" }
      : syncState === "offline"
        ? { label: "offline", tone: "text-warning", dot: "bg-warning" }
        : { label: "saved", tone: "text-success", dot: "bg-success" };

  // Full-height cells split by 1px rules — no pill groups.
  const cell = "flex items-center border-border-default";

  return (
    <header className="h-12 bg-surface-1 border-b border-border-default flex items-stretch shrink-0 relative z-50 whitespace-nowrap">
      {/* ---- Identity ---- */}
      <button
        onClick={onOpenProjects}
        title="My projects"
        aria-label="My projects"
        className={cx(
          cell,
          "w-16 justify-center border-r shrink-0 text-[15px] font-black font-wide tracking-[-0.02em] text-text-primary hover:bg-surface-3 transition-colors",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        )}
      >
        mo<span className="text-accent">.</span>
      </button>

      <div className={cx(cell, "gap-3 px-4 border-r min-w-0")}>
        <span className="font-mono text-[11px] font-medium text-text-tertiary shrink-0 hidden sm:inline">
          Nº {formatProjectNumber(projectNumber)}
        </span>
        {isEditingName ? (
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
            autoFocus
            aria-label="Project name"
            className="bg-surface-3 text-[14px] font-semibold text-text-primary px-2 h-7 outline-none shadow-[inset_0_0_0_1.5px_var(--selection)] w-44"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            aria-label={`Rename project (current: ${projectName})`}
            className="text-[14px] font-semibold text-text-primary truncate max-w-[200px] hover:underline underline-offset-4 decoration-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
          >
            {projectName}
          </button>
        )}
        <span
          className={cx("hidden sm:flex items-center gap-[5px] font-mono text-[11px] shrink-0", status.tone)}
          aria-live="polite"
        >
          <span className={cx("w-1.5 h-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      {/* Size picker */}
      <div className={cx(cell, "relative border-r hidden md:flex")} ref={formatMenuRef}>
        <button
          onClick={() => setShowFormatMenu((v) => !v)}
          aria-label={`Canvas size: ${format.width} by ${format.height}. Change`}
          aria-haspopup="menu"
          aria-expanded={showFormatMenu}
          className="h-full flex items-center gap-2 px-3.5 font-mono text-[12px] font-medium text-text-primary tabular-nums hover:bg-surface-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          <span className="w-[11px] h-[11px] border-[1.5px] border-current" aria-hidden />
          {format.width} × {format.height}
          <ChevronDownIcon className="w-2.5 h-2.5" />
        </button>
        {showFormatMenu && (
          <div className="absolute top-full mt-1 left-0 bg-surface-2 border border-border-default rounded-float py-1 min-w-[240px] shadow-pop animate-scale-in">
            {CANVAS_FORMATS.map((fmt) => (
              <button
                key={fmt.label}
                onClick={() => {
                  setFormat(fmt);
                  setShowFormatMenu(false);
                }}
                className={cx(
                  "w-full text-left px-3 py-2 text-[12.5px] flex justify-between items-center gap-4 hover:bg-surface-3 transition-colors duration-150 ease-standard",
                  fmt.label === format.label
                    ? "text-text-primary font-bold shadow-[inset_3px_0_0_var(--text-primary)]"
                    : "text-text-secondary"
                )}
              >
                <span>{fmt.label}</span>
                <span className="text-text-tertiary font-mono text-[11px] tabular-nums">
                  {fmt.width} × {fmt.height}
                </span>
              </button>
            ))}
            <div className="border-t border-border-default mt-1 pt-2 px-3 pb-2 space-y-2">
              <span className="font-mono text-[10.5px] uppercase text-text-tertiary block">
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
                  className="w-full min-w-0 h-7 bg-surface-3 text-[11.5px] font-mono tabular-nums text-text-primary px-2 outline-none focus:shadow-[inset_0_0_0_1.5px_var(--selection)]"
                  placeholder="W"
                  aria-label="Custom width"
                />
                <span className="text-text-tertiary text-[11.5px]">×</span>
                <input
                  type="number"
                  min={50}
                  max={8000}
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyCustomFormat()}
                  className="w-full min-w-0 h-7 bg-surface-3 text-[11.5px] font-mono tabular-nums text-text-primary px-2 outline-none focus:shadow-[inset_0_0_0_1.5px_var(--selection)]"
                  placeholder="H"
                  aria-label="Custom height"
                />
                <button
                  onClick={applyCustomFormat}
                  className="h-7 text-[11px] uppercase font-bold bg-surface-inverse text-text-inverse px-2.5 shrink-0"
                >
                  Set
                </button>
              </div>
              <span className="text-[10.5px] text-text-tertiary block font-mono tabular-nums">
                50 – 8000 PX
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tools */}
      <div className={cx(cell, "gap-[2px] px-2 border-r hidden md:flex")}>
        <ToolToggle
          label="Select"
          active={activeTool === "cursor"}
          onClick={() => setActiveTool("cursor")}
        >
          <CursorIcon className="w-[15px] h-[15px]" />
        </ToolToggle>
        <ToolToggle
          label="Hand (pan)"
          active={activeTool === "hand"}
          onClick={() => setActiveTool("hand")}
        >
          <HandIcon className="w-[15px] h-[15px]" />
        </ToolToggle>
        <div className="w-px h-[18px] bg-border-default mx-1" />
        <ToolToggle label="Undo" onClick={undo} disabled={past.length === 0}>
          <UndoIcon className="w-[15px] h-[15px]" />
        </ToolToggle>
        <ToolToggle label="Redo" onClick={redo} disabled={future.length === 0}>
          <RedoIcon className="w-[15px] h-[15px]" />
        </ToolToggle>
      </div>

      <div className="flex-1" />

      <input
        ref={fileInputRef}
        type="file"
        accept={`.${FILE_EXTENSION},application/json`}
        onChange={handleImportFile}
        className="hidden"
      />

      {/* File menu — also the home for the install and shortcuts actions. */}
      <div className={cx(cell, "relative border-l")} ref={fileMenuRef}>
        <button
          onClick={() => setShowFileMenu((v) => !v)}
          aria-label="File and project options"
          aria-haspopup="menu"
          aria-expanded={showFileMenu}
          className="h-full flex items-center px-4 text-[13px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
        >
          File
        </button>
        {showFileMenu && (
          <div className="absolute top-full mt-1 right-0 bg-surface-2 border border-border-default rounded-float py-1 min-w-[240px] shadow-pop animate-scale-in z-50">
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

            <div className="border-t border-border-default my-1" />
            <span className="font-mono text-[10.5px] uppercase text-text-tertiary px-3 py-1 block">
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
              <span className="text-[10.5px] text-text-tertiary uppercase font-mono">
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
              <span className="text-[10.5px] text-text-tertiary uppercase font-mono">
                .{FILE_EXTENSION}
              </span>
            </button>

            <div className="border-t border-border-default my-1" />
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
              <kbd className="text-[10.5px] text-text-tertiary font-mono">?</kbd>
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
          className={cx(
            cell,
            "hidden sm:flex gap-2 px-4 border-l text-[13px] font-semibold text-text-primary hover:bg-surface-3 transition-colors",
            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
          )}
        >
          Try Pro
          <span className="font-mono text-[10.5px] font-medium border border-text-primary px-1 py-px">
            {PRO_PRICE}
          </span>
        </button>
      )}

      {/* The one primary action on the screen. */}
      <div className={cx(cell, "px-2.5 border-l")}>
        <button
          onClick={onOpenExport}
          aria-label="Export"
          className="h-8 flex items-center gap-2.5 px-4 bg-accent hover:bg-accent-hover active:shadow-[inset_0_2px_0_rgb(0_0_0/0.25)] text-accent-fg text-[13px] font-extrabold font-expanded uppercase tracking-[0.02em] transition-colors duration-150 ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
        >
          Export
          <DownloadIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={cx(cell, "w-12 justify-center border-l shrink-0")}>
        <AccountMenu />
      </div>
    </header>
  );
}

/** A 32×30 cell in the tools group; the active tool is an ink fill. */
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
