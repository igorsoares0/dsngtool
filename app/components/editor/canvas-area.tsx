"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";

const CanvasStage = dynamic(() => import("./canvas-stage"), { ssr: false });

export default function CanvasArea({
  stageRef,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);

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

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-surface-0 overflow-hidden relative"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_50%,#0c0c0c_100%)] opacity-60 z-10" />

      {dims.width > 0 && (
        <CanvasStage
          stageRef={stageRef}
          containerWidth={dims.width}
          containerHeight={dims.height}
        />
      )}

      {/* Info pill */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface-2/80 backdrop-blur-sm border border-border-subtle rounded-full px-3 py-1.5 z-20">
        <span className="text-[10px] text-text-ghost tabular-nums">
          {format.width} × {format.height}
        </span>
        <span className="text-[10px] text-text-ghost tabular-nums">{zoom}%</span>
      </div>
    </div>
  );
}
