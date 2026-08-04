"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import { resolveFontFamily } from "../../lib/fonts";
import type { InlineEditRequest, SelectionRect } from "./canvas-stage";
import SelectionToolbar from "./selection-toolbar";
import ContextMenu, { type ContextMenuRequest } from "./context-menu";
import AiBar from "./ai-bar";
import IconButton from "../ui/icon-button";
import { ZoomInIcon, ZoomOutIcon } from "./icons";

const CanvasStage = dynamic(() => import("./canvas-stage"), { ssr: false });

function InlineTextEditor({
  req,
  scale,
  offsetX,
  offsetY,
  onFinish,
}: {
  req: InlineEditRequest;
  scale: number;
  offsetX: number;
  offsetY: number;
  onFinish: (elementId: string, newText: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoSize = (ta: HTMLTextAreaElement) => {
    ta.style.width = "0px";
    ta.style.height = "0px";
    ta.style.width = `${ta.scrollWidth + 2}px`;
    ta.style.height = `${ta.scrollHeight}px`;
  };

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
    autoSize(ta);
  }, []);

  const commit = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    onFinish(req.elementId, ta.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      commit();
    }
  };

  const left = offsetX + req.x * scale;
  const top = offsetY + req.y * scale;
  const width = req.width * scale;
  const fontSize = req.fontSize * scale;
  const lineHeight = req.lineHeight;

  const fontWeight =
    req.fontStyle.includes("bold") ? "bold" : "normal";
  const fontStyleCss =
    req.fontStyle.includes("italic") ? "italic" : "normal";

  return (
    <textarea
      ref={textareaRef}
      defaultValue={req.text}
      aria-label="Edit text"
      wrap="off"
      onBlur={commit}
      onKeyDown={handleKeyDown}
      onInput={(e) => autoSize(e.currentTarget)}
      className="absolute z-30 outline-none border-2 border-accent rounded-sm bg-transparent resize-none overflow-hidden"
      style={{
        left,
        top,
        width,
        minHeight: fontSize * lineHeight + 4,
        fontSize,
        fontFamily: resolveFontFamily(req.fontFamily),
        fontWeight,
        fontStyle: fontStyleCss,
        color: req.fill,
        textAlign: req.align,
        lineHeight,
        letterSpacing: req.letterSpacing * scale,
        whiteSpace: "pre",
        transformOrigin: "top left",
        transform: `rotate(${req.rotation}deg)`,
        padding: 0,
        margin: 0,
        boxSizing: "border-box",
      }}
    />
  );
}

export default function CanvasArea({
  stageRef,
  aiFocusSignal,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  aiFocusSignal: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const activeTool = useEditorStore((s) => s.activeTool);
  const spaceHeld = useEditorStore((s) => s.spaceHeld);
  const updateElement = useEditorStore((s) => s.updateElement);
  const elementCount = useEditorStore((s) => s.elements.length);

  const [editReq, setEditReq] = useState<InlineEditRequest | null>(null);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [menuReq, setMenuReq] = useState<ContextMenuRequest | null>(null);
  const lastFitFormatRef = useRef<string | null>(null);

  const scale = zoom / 100;
  const offsetX = (dims.width - format.width * scale) / 2 + panX;
  const offsetY = (dims.height - format.height * scale) / 2 + panY;

  const handMode = activeTool === "hand" || spaceHeld;
  const cursorStyle = handMode ? "grab" : "default";

  const measure = useCallback(() => {
    if (containerRef.current) {
      setDims({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Ctrl/Cmd + wheel → zoom canvas around cursor (intercept browser zoom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const state = useEditorStore.getState();
      const current = state.zoom;
      const factor = Math.exp(-e.deltaY * 0.005);
      const next = Math.max(10, Math.min(400, Math.round(current * factor)));
      if (next === current) return;
      const oldScale = current / 100;
      const newScale = next / 100;
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const oldOffsetX = (rect.width - state.format.width * oldScale) / 2 + state.panX;
      const oldOffsetY = (rect.height - state.format.height * oldScale) / 2 + state.panY;
      const canvasPtX = (cx - oldOffsetX) / oldScale;
      const canvasPtY = (cy - oldOffsetY) / oldScale;
      const newOffsetX = cx - canvasPtX * newScale;
      const newOffsetY = cy - canvasPtY * newScale;
      const newPanX = newOffsetX - (rect.width - state.format.width * newScale) / 2;
      const newPanY = newOffsetY - (rect.height - state.format.height * newScale) / 2;
      state.setZoom(next);
      state.setPan(newPanX, newPanY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Space key → temporary hand-tool override
  useEffect(() => {
    const isInteractiveTarget = (t: EventTarget | null) => {
      if (!(t instanceof HTMLElement)) return false;
      const tag = t.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        t.isContentEditable
      );
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      if (isInteractiveTarget(e.target)) return;
      e.preventDefault();
      useEditorStore.getState().setSpaceHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      useEditorStore.getState().setSpaceHeld(false);
    };
    const onBlur = () => useEditorStore.getState().setSpaceHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  /** Scale the document to fit the viewport and recentre it. Shared by the
   *  auto-fit effect and the zoom pill's "Fit" button. */
  const fitToScreen = useCallback(() => {
    if (dims.width === 0 || dims.height === 0) return;
    const padding = 80;
    const fitScale = Math.min(
      (dims.width - padding) / format.width,
      (dims.height - padding) / format.height,
      1
    );
    setZoom(Math.max(10, Math.floor(fitScale * 100)));
    useEditorStore.getState().resetPan();
  }, [dims, format, setZoom]);

  // Auto-fit on first render and whenever the format changes.
  useEffect(() => {
    if (dims.width === 0 || dims.height === 0) return;
    const formatKey = `${format.width}x${format.height}`;
    if (lastFitFormatRef.current === formatKey) return;
    fitToScreen();
    lastFitFormatRef.current = formatKey;
  }, [dims, format, fitToScreen]);

  const handleStartEditing = useCallback((req: InlineEditRequest) => {
    setEditReq(req);
  }, []);

  const handleFinishEditing = useCallback(
    (elementId: string, newText: string) => {
      if (newText.trim() !== "") {
        updateElement(elementId, { text: newText });
      }
      setEditReq(null);
    },
    [updateElement]
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-surface-0 overflow-hidden relative canvas-dots"
      style={{ cursor: cursorStyle }}
    >
      {dims.width > 0 && (
        <CanvasStage
          stageRef={stageRef}
          containerWidth={dims.width}
          containerHeight={dims.height}
          onStartEditing={handleStartEditing}
          editingId={editReq?.elementId ?? null}
          onSelectionRect={setSelectionRect}
          onContextMenu={setMenuReq}
        />
      )}

      {/* Contextual toolbar anchored to the selection */}
      {selectionRect && !editReq && !menuReq && (
        <SelectionToolbar rect={selectionRect} containerWidth={dims.width} />
      )}

      {/* Right-click context menu */}
      {menuReq && (
        <ContextMenu
          req={menuReq}
          containerWidth={dims.width}
          containerHeight={dims.height}
          onClose={() => setMenuReq(null)}
        />
      )}

      {/* Empty state hint (centered on canvas) */}
      {elementCount === 0 && !editReq && dims.width > 0 && (
        <div
          className="absolute pointer-events-none flex items-center justify-center z-10"
          style={{
            left: offsetX,
            top: offsetY,
            width: format.width * scale,
            height: format.height * scale,
          }}
        >
          {/* One ghost line and nothing else — the canvas is the subject. */}
          <p className="text-[13px] text-text-ghost text-center max-w-[240px] leading-relaxed animate-fade-in">
            Nothing here yet. Pick a template from the left, or describe a post below.
          </p>
        </div>
      )}

      {/* Inline text editor overlay */}
      {editReq && (
        <InlineTextEditor
          req={editReq}
          scale={scale}
          offsetX={offsetX}
          offsetY={offsetY}
          onFinish={handleFinishEditing}
        />
      )}

      {/* Zoom pill — moved out of the topbar so it sits with what it controls. */}
      <div className="absolute bottom-[calc(45vh+1rem)] lg:bottom-4 left-4 z-20 flex items-center gap-0.5 h-9 px-1 bg-surface-2 border border-border-default rounded-[10px] shadow-pop">
        <IconButton
          label="Zoom out"
          size="sm"
          tooltip={false}
          onClick={() => setZoom(zoom - 10)}
        >
          <ZoomOutIcon className="w-3.5 h-3.5" />
        </IconButton>
        <span
          className="text-[11px] font-mono tabular-nums text-text-primary min-w-[36px] text-center"
          aria-label={`Zoom ${zoom} percent`}
          aria-live="polite"
        >
          {zoom}%
        </span>
        <IconButton
          label="Zoom in"
          size="sm"
          tooltip={false}
          onClick={() => setZoom(zoom + 10)}
        >
          <ZoomInIcon className="w-3.5 h-3.5" />
        </IconButton>
        <div className="w-px h-4 bg-border-subtle mx-1" />
        <button
          onClick={fitToScreen}
          className="text-[11.5px] text-text-secondary hover:text-text-primary px-2 py-1 rounded-sm transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Fit
        </button>
      </div>

      <AiBar focusSignal={aiFocusSignal} />
    </div>
  );
}
