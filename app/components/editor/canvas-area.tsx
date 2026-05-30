"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import type { InlineEditRequest } from "./canvas-stage";

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

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.focus();
    ta.select();
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
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="absolute z-30 outline-none border-2 border-accent-green rounded-sm bg-transparent resize-none overflow-hidden"
      style={{
        left,
        top,
        width,
        minHeight: fontSize * lineHeight + 4,
        fontSize,
        fontFamily: req.fontFamily,
        fontWeight,
        fontStyle: fontStyleCss,
        color: req.fill,
        textAlign: req.align,
        lineHeight,
        letterSpacing: req.letterSpacing * scale,
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
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const updateElement = useEditorStore((s) => s.updateElement);
  const elementCount = useEditorStore((s) => s.elements.length);

  const [editReq, setEditReq] = useState<InlineEditRequest | null>(null);
  const lastFitFormatRef = useRef<string | null>(null);

  const scale = zoom / 100;
  const offsetX = (dims.width - format.width * scale) / 2;
  const offsetY = (dims.height - format.height * scale) / 2;

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

  // Ctrl/Cmd + wheel → zoom canvas (intercept browser zoom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.005);
      const current = useEditorStore.getState().zoom;
      useEditorStore.getState().setZoom(Math.round(current * factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Auto-fit zoom on first render and whenever format changes
  useEffect(() => {
    if (dims.width === 0 || dims.height === 0) return;
    const formatKey = `${format.width}x${format.height}`;
    if (lastFitFormatRef.current === formatKey) return;
    const padding = 80;
    const fitScale = Math.min(
      (dims.width - padding) / format.width,
      (dims.height - padding) / format.height,
      1
    );
    setZoom(Math.max(10, Math.floor(fitScale * 100)));
    lastFitFormatRef.current = formatKey;
  }, [dims, format, setZoom]);

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
      className="flex-1 bg-surface-0 overflow-hidden relative"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {dims.width > 0 && (
        <CanvasStage
          stageRef={stageRef}
          containerWidth={dims.width}
          containerHeight={dims.height}
          onStartEditing={handleStartEditing}
          editingId={editReq?.elementId ?? null}
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
          <div className="text-center max-w-[280px] px-6 py-5 rounded-lg bg-surface-2 border border-border-default shadow-xl animate-fade-in">
            <div className="text-[13px] font-medium text-text-primary mb-1.5">
              Start designing
            </div>
            <div className="text-[11px] text-text-secondary leading-relaxed">
              Pick a <span className="text-accent-green">template</span>, add{" "}
              <span className="text-accent-green">text</span> or{" "}
              <span className="text-accent-green">shapes</span> from the left
              sidebar.
            </div>
            <div className="mt-2.5 text-[10px] text-text-tertiary">
              Press{" "}
              <kbd className="px-1.5 py-px bg-surface-3 border border-border-subtle rounded font-mono text-text-secondary">
                ?
              </kbd>{" "}
              for shortcuts
            </div>
          </div>
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

      {/* Info pill */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface-2/80 backdrop-blur-sm border border-border-subtle rounded-full px-3 py-1.5 z-20">
        <span className="text-[10px] text-text-ghost tabular-nums">
          {format.width} × {format.height}
        </span>
        <span className="text-[10px] text-text-ghost tabular-nums">
          {zoom}%
        </span>
      </div>
    </div>
  );
}
