"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Image, Transformer, Line } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import { resolveFontFamily } from "../../lib/fonts";
import type { EditorElement, ShapeElement, TextElement, ImageElement } from "../../types/editor";

interface Guide {
  orientation: "v" | "h";
  pos: number;
  start: number;
  end: number;
}

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SnapTargetX {
  pos: number;
  guideStart: number;
  guideEnd: number;
}
interface SnapTargetY extends SnapTargetX {}

function computeSnap(
  proposed: BBox,
  others: BBox[],
  canvas: { width: number; height: number },
  threshold: number
): { x: number; y: number; guides: Guide[] } {
  const propEdgesX = [
    { pos: proposed.x, kind: "left" as const },
    { pos: proposed.x + proposed.width / 2, kind: "center" as const },
    { pos: proposed.x + proposed.width, kind: "right" as const },
  ];
  const propEdgesY = [
    { pos: proposed.y, kind: "top" as const },
    { pos: proposed.y + proposed.height / 2, kind: "middle" as const },
    { pos: proposed.y + proposed.height, kind: "bottom" as const },
  ];

  const targetsX: SnapTargetX[] = [
    { pos: 0, guideStart: 0, guideEnd: canvas.height },
    { pos: canvas.width / 2, guideStart: 0, guideEnd: canvas.height },
    { pos: canvas.width, guideStart: 0, guideEnd: canvas.height },
  ];
  for (const o of others) {
    const s = Math.min(o.y, proposed.y);
    const e = Math.max(o.y + o.height, proposed.y + proposed.height);
    targetsX.push({ pos: o.x, guideStart: s, guideEnd: e });
    targetsX.push({ pos: o.x + o.width / 2, guideStart: s, guideEnd: e });
    targetsX.push({ pos: o.x + o.width, guideStart: s, guideEnd: e });
  }

  const targetsY: SnapTargetY[] = [
    { pos: 0, guideStart: 0, guideEnd: canvas.width },
    { pos: canvas.height / 2, guideStart: 0, guideEnd: canvas.width },
    { pos: canvas.height, guideStart: 0, guideEnd: canvas.width },
  ];
  for (const o of others) {
    const s = Math.min(o.x, proposed.x);
    const e = Math.max(o.x + o.width, proposed.x + proposed.width);
    targetsY.push({ pos: o.y, guideStart: s, guideEnd: e });
    targetsY.push({ pos: o.y + o.height / 2, guideStart: s, guideEnd: e });
    targetsY.push({ pos: o.y + o.height, guideStart: s, guideEnd: e });
  }

  let bestX: { delta: number; target: SnapTargetX } | null = null;
  for (const e of propEdgesX) {
    for (const t of targetsX) {
      const d = t.pos - e.pos;
      if (Math.abs(d) <= threshold && (!bestX || Math.abs(d) < Math.abs(bestX.delta))) {
        bestX = { delta: d, target: t };
      }
    }
  }

  let bestY: { delta: number; target: SnapTargetY } | null = null;
  for (const e of propEdgesY) {
    for (const t of targetsY) {
      const d = t.pos - e.pos;
      if (Math.abs(d) <= threshold && (!bestY || Math.abs(d) < Math.abs(bestY.delta))) {
        bestY = { delta: d, target: t };
      }
    }
  }

  const guides: Guide[] = [];
  if (bestX) {
    guides.push({
      orientation: "v",
      pos: bestX.target.pos,
      start: bestX.target.guideStart,
      end: bestX.target.guideEnd,
    });
  }
  if (bestY) {
    guides.push({
      orientation: "h",
      pos: bestY.target.pos,
      start: bestY.target.guideStart,
      end: bestY.target.guideEnd,
    });
  }

  return {
    x: proposed.x + (bestX?.delta ?? 0),
    y: proposed.y + (bestY?.delta ?? 0),
    guides,
  };
}

function snapResize(
  oldBox: BBox,
  newBox: BBox,
  others: BBox[],
  canvas: { width: number; height: number },
  threshold: number
): { box: BBox; guides: Guide[] } {
  let { x, y, width, height } = newBox;
  const right = x + width;
  const bottom = y + height;

  const eps = 0.001;
  const leftMoved = Math.abs(x - oldBox.x) > eps;
  const rightMoved = Math.abs(right - (oldBox.x + oldBox.width)) > eps;
  const topMoved = Math.abs(y - oldBox.y) > eps;
  const bottomMoved = Math.abs(bottom - (oldBox.y + oldBox.height)) > eps;

  const targetsX: number[] = [0, canvas.width / 2, canvas.width];
  for (const o of others) targetsX.push(o.x, o.x + o.width / 2, o.x + o.width);
  const targetsY: number[] = [0, canvas.height / 2, canvas.height];
  for (const o of others) targetsY.push(o.y, o.y + o.height / 2, o.y + o.height);

  const findBest = (value: number, targets: number[]): number | null => {
    let best: number | null = null;
    let bestD = threshold;
    for (const t of targets) {
      const d = Math.abs(t - value);
      if (d <= bestD) {
        best = t;
        bestD = d;
      }
    }
    return best;
  };

  const snapLeft = leftMoved ? findBest(x, targetsX) : null;
  const snapRight = rightMoved ? findBest(right, targetsX) : null;
  const snapTop = topMoved ? findBest(y, targetsY) : null;
  const snapBottom = bottomMoved ? findBest(bottom, targetsY) : null;

  if (snapLeft !== null && snapRight !== null) {
    x = snapLeft;
    width = snapRight - snapLeft;
  } else if (snapLeft !== null) {
    width = right - snapLeft;
    x = snapLeft;
  } else if (snapRight !== null) {
    width = snapRight - x;
  }

  if (snapTop !== null && snapBottom !== null) {
    y = snapTop;
    height = snapBottom - snapTop;
  } else if (snapTop !== null) {
    height = (newBox.y + newBox.height) - snapTop;
    y = snapTop;
  } else if (snapBottom !== null) {
    height = snapBottom - y;
  }

  const guides: Guide[] = [];
  if (snapLeft !== null) guides.push({ orientation: "v", pos: snapLeft, start: 0, end: canvas.height });
  if (snapRight !== null) guides.push({ orientation: "v", pos: snapRight, start: 0, end: canvas.height });
  if (snapTop !== null) guides.push({ orientation: "h", pos: snapTop, start: 0, end: canvas.width });
  if (snapBottom !== null) guides.push({ orientation: "h", pos: snapBottom, start: 0, end: canvas.width });

  return { box: { x, y, width, height }, guides };
}

export interface InlineEditRequest {
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fill: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
}

interface DragHandlers {
  onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

function useImage(src: string): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return image;
}

function ImageNode({
  el,
  onSelect,
  drag,
  disableDrag,
}: {
  el: ImageElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  drag: DragHandlers;
  disableDrag: boolean;
}) {
  const shapeRef = useRef<Konva.Image>(null);
  const image = useImage(el.src);

  const flipSx = el.flipX ? -1 : 1;
  const flipSy = el.flipY ? -1 : 1;

  // Apply Konva filters
  useEffect(() => {
    const node = shapeRef.current;
    if (!node || !image) return;
    const filters: Parameters<Konva.Node["filters"]>[0] = [];
    if ((el.filterBlur || 0) > 0) filters.push(Konva.Filters.Blur);
    if ((el.filterBrightness || 0) !== 0) filters.push(Konva.Filters.Brighten);
    if ((el.filterContrast || 0) !== 0) filters.push(Konva.Filters.Contrast);
    if ((el.filterSaturation || 0) !== 0) filters.push(Konva.Filters.HSV);
    if (el.filterGrayscale) filters.push(Konva.Filters.Grayscale);
    if (el.filterSepia) filters.push(Konva.Filters.Sepia);
    if (el.filterInvert) filters.push(Konva.Filters.Invert);
    if (filters.length > 0) {
      node.cache();
      node.filters(filters);
    } else {
      node.clearCache();
      node.filters([]);
    }
    node.getLayer()?.batchDraw();
  }, [
    image,
    el.filterBlur,
    el.filterBrightness,
    el.filterContrast,
    el.filterSaturation,
    el.filterGrayscale,
    el.filterSepia,
    el.filterInvert,
    el.width,
    el.height,
  ]);

  return (
    <Image
      ref={shapeRef}
      image={image || undefined}
      blurRadius={el.filterBlur || 0}
      brightness={el.filterBrightness || 0}
      contrast={el.filterContrast || 0}
      saturation={el.filterSaturation || 0}
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      offsetX={el.flipX ? el.width : 0}
      offsetY={el.flipY ? el.height : 0}
      scaleX={flipSx}
      scaleY={flipSy}
      rotation={el.rotation}
      opacity={el.opacity}
      cornerRadius={el.cornerRadius || 0}
      shadowColor={el.shadowColor || "#000000"}
      shadowBlur={el.shadowBlur || 0}
      shadowEnabled={(el.shadowBlur || 0) > 0}
      shadowOpacity={0.4}
      draggable={!el.locked && !disableDrag}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={drag.onDragStart}
      onDragMove={drag.onDragMove}
      onDragEnd={drag.onDragEnd}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;
        const sx = Math.abs(node.scaleX());
        const sy = Math.abs(node.scaleY());
        const newW = Math.max(5, node.width() * sx);
        const newH = Math.max(5, node.height() * sy);
        node.scaleX(flipSx);
        node.scaleY(flipSy);
        node.offsetX(el.flipX ? newW : 0);
        node.offsetY(el.flipY ? newH : 0);
        useEditorStore.getState().updateElement(el.id, {
          x: node.x(),
          y: node.y(),
          width: newW,
          height: newH,
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeNode({
  el,
  onSelect,
  drag,
  disableDrag,
}: {
  el: ShapeElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  drag: DragHandlers;
  disableDrag: boolean;
}) {
  const shapeRef = useRef<Konva.Rect | Konva.Ellipse | Konva.Line>(null);

  const g = el.gradient;
  const gradientProps = g
    ? g.type === "linear"
      ? {
          fillLinearGradientStartPoint: { x: g.startX * el.width, y: g.startY * el.height },
          fillLinearGradientEndPoint: { x: g.endX * el.width, y: g.endY * el.height },
          fillLinearGradientColorStops: g.colorStops,
          fill: undefined,
        }
      : {
          fillRadialGradientStartPoint: { x: g.startX * el.width, y: g.startY * el.height },
          fillRadialGradientEndPoint: { x: g.endX * el.width, y: g.endY * el.height },
          fillRadialGradientStartRadius: (g.startRadius ?? 0) * Math.min(el.width, el.height),
          fillRadialGradientEndRadius: (g.endRadius ?? 0.7) * Math.min(el.width, el.height),
          fillRadialGradientColorStops: g.colorStops,
          fill: undefined,
        }
    : { fill: el.fill };

  const commonProps = {
    id: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    ...gradientProps,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth || 0,
    draggable: !el.locked && !disableDrag,
    onClick: onSelect,
    onTap: onSelect,
    onDragStart: drag.onDragStart,
    onDragMove: drag.onDragMove,
    onDragEnd: drag.onDragEnd,
    onTransformEnd: () => {
      const node = shapeRef.current;
      if (!node) return;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      useEditorStore.getState().updateElement(el.id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  if (el.shapeType === "ellipse") {
    return (
      <Ellipse
        ref={shapeRef as React.RefObject<Konva.Ellipse | null>}
        {...commonProps}
        radiusX={el.width / 2}
        radiusY={el.height / 2}
        offset={{ x: -el.width / 2, y: -el.height / 2 }}
      />
    );
  }

  if (el.shapeType === "triangle") {
    return (
      <Line
        ref={shapeRef as React.RefObject<Konva.Line | null>}
        {...commonProps}
        points={[el.width / 2, 0, el.width, el.height, 0, el.height]}
        closed
        width={el.width}
        height={el.height}
      />
    );
  }

  if (el.shapeType === "line") {
    return (
      <Line
        ref={shapeRef as React.RefObject<Konva.Line | null>}
        {...commonProps}
        fill={undefined}
        points={[0, el.height / 2, el.width, el.height / 2]}
        stroke={el.stroke || "#000000"}
        strokeWidth={el.strokeWidth || 4}
        lineCap="round"
        hitStrokeWidth={Math.max(el.strokeWidth || 4, 12)}
        width={el.width}
        height={el.height}
      />
    );
  }

  return (
    <Rect
      ref={shapeRef as React.RefObject<Konva.Rect | null>}
      {...commonProps}
      width={el.width}
      height={el.height}
      cornerRadius={el.cornerRadius || 0}
    />
  );
}

// Measure the natural (unconstrained) width of a text element using an
// offscreen Konva.Text — same engine as the canvas, so it stays accurate.
function measureTextWidth(el: TextElement): number {
  const node = new Konva.Text({
    text: el.textTransform === "uppercase" ? el.text.toUpperCase() : el.text,
    fontSize: el.fontSize,
    fontFamily: resolveFontFamily(el.fontFamily),
    fontStyle: el.fontStyle || "normal",
    lineHeight: el.lineHeight || 1.2,
    letterSpacing: el.letterSpacing || 0,
    padding: 0,
  });
  const w = node.width();
  node.destroy();
  return w;
}

function TextNode({
  el,
  onSelect,
  drag,
  onStartEditing,
  isEditing,
  disableDrag,
}: {
  el: TextElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  drag: DragHandlers;
  onStartEditing: (req: InlineEditRequest) => void;
  isEditing: boolean;
  disableDrag: boolean;
}) {
  const shapeRef = useRef<Konva.Text>(null);

  // Auto-width: keep the element box hugging the measured text. Adjusts x so the
  // alignment anchor (left/center/right) stays put. Silent — no history/loops.
  // Skipped when the user has set an explicit width (autoWidth === false).
  useEffect(() => {
    if (el.autoWidth === false) return;
    const measured = Math.ceil(measureTextWidth(el));
    if (measured > 0 && Math.abs(measured - el.width) > 1) {
      const factor = el.align === "center" ? 0.5 : el.align === "right" ? 1 : 0;
      const dx = (el.width - measured) * factor;
      useEditorStore.getState().updateElementSilent(el.id, {
        width: measured,
        x: el.x + dx,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    el.text,
    el.fontSize,
    el.fontFamily,
    el.fontStyle,
    el.lineHeight,
    el.letterSpacing,
    el.textTransform,
    el.align,
  ]);

  const handleDblClick = () => {
    const node = shapeRef.current;
    if (!node) return;

    onStartEditing({
      elementId: el.id,
      x: el.x,
      y: el.y,
      width: el.width,
      height: node.height(),
      rotation: el.rotation,
      text: el.text,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      fontStyle: el.fontStyle || "normal",
      fill: el.fill,
      align: el.align,
      lineHeight: el.lineHeight || 1.2,
      letterSpacing: el.letterSpacing || 0,
    });
  };

  return (
    <Text
      ref={shapeRef}
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      text={el.textTransform === "uppercase" ? el.text.toUpperCase() : el.text}
      fontSize={el.fontSize}
      fontFamily={resolveFontFamily(el.fontFamily)}
      fill={el.fill}
      align={el.align}
      fontStyle={el.fontStyle || "normal"}
      textDecoration={el.textDecoration || ""}
      lineHeight={el.lineHeight || 1.2}
      letterSpacing={el.letterSpacing || 0}
      shadowColor={el.shadowColor || "#000000"}
      shadowBlur={el.shadowBlur || 0}
      shadowOffsetX={el.shadowOffsetX || 0}
      shadowOffsetY={el.shadowOffsetY || 0}
      shadowOpacity={el.shadowOpacity ?? 1}
      shadowEnabled={
        (el.shadowBlur || 0) > 0 ||
        (el.shadowOffsetX || 0) !== 0 ||
        (el.shadowOffsetY || 0) !== 0
      }
      rotation={el.rotation}
      opacity={isEditing ? 0 : el.opacity}
      draggable={!el.locked && !isEditing && !disableDrag}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={drag.onDragStart}
      onDragMove={drag.onDragMove}
      onDragEnd={drag.onDragEnd}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        // Side handle (width only, height untouched) → fixed-width text that
        // wraps. Corner handle (uniform scale) → scale the font, stay auto-width.
        const widthOnly =
          Math.abs(scaleY - 1) < 0.01 && Math.abs(scaleX - 1) > 0.01;
        if (widthOnly) {
          useEditorStore.getState().updateElement(el.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            rotation: node.rotation(),
            autoWidth: false,
          });
        } else {
          useEditorStore.getState().updateElement(el.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            fontSize: Math.max(8, el.fontSize * scaleY),
            rotation: node.rotation(),
          });
        }
      }}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
    />
  );
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function CanvasStage({
  stageRef,
  containerWidth,
  containerHeight,
  onStartEditing,
  editingId,
  onSelectionRect,
  onContextMenu,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  containerWidth: number;
  containerHeight: number;
  onStartEditing: (req: InlineEditRequest) => void;
  editingId: string | null;
  onSelectionRect?: (rect: SelectionRect | null) => void;
  onContextMenu?: (req: { x: number; y: number; targetId: string | null }) => void;
}) {
  const elements = useEditorStore((s) => s.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const activeTool = useEditorStore((s) => s.activeTool);
  const spaceHeld = useEditorStore((s) => s.spaceHeld);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const backgroundGradient = useEditorStore((s) => s.backgroundGradient);
  const selectElement = useEditorStore((s) => s.selectElement);
  const setSelectedIds = useEditorStore((s) => s.setSelectedIds);

  const transformerRef = useRef<Konva.Transformer>(null);
  // Multi-select drags are moved as a unit by Konva's Transformer (its built-in
  // proxy drag), so every dragged node fires dragend. This guards the final
  // commit so we write all positions to the store exactly once per gesture.
  const groupCommitScheduled = useRef(false);
  const snapData = useRef<{ width: number; height: number; others: BBox[] } | null>(null);
  // Snap context for multi-select drags: dimensions of each selected element
  // (positions are read live from Konva) plus the non-selected elements to
  // align against. Built once at drag start.
  const groupSnap = useRef<{
    dims: Map<string, { width: number; height: number }>;
    others: BBox[];
  } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [marquee, setMarquee] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const marqueeBaseSelection = useRef<string[]>([]);
  const marqueeAdditive = useRef<boolean>(false);
  const panStart = useRef<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const handMode = activeTool === "hand" || spaceHeld;
  const scale = zoom / 100;

  const offsetX = (containerWidth - format.width * scale) / 2 + panX;
  const offsetY = (containerHeight - format.height * scale) / 2 + panY;

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedIds.length > 0 && !editingId) {
      const nodes = selectedIds
        .map((id) => stage.findOne(`#${id}`))
        .filter((n): n is Konva.Node => n !== undefined);
      if (nodes.length > 0) {
        tr.nodes(nodes);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, elements, stageRef, editingId]);

  // Report the screen-space bounding box of the current selection so the
  // contextual toolbar (a DOM overlay) can anchor itself to it. Hidden while
  // the user is dragging/resizing, panning, or editing text inline.
  const onSelectionRectRef = useRef(onSelectionRect);
  onSelectionRectRef.current = onSelectionRect;
  const onContextMenuRef = useRef(onContextMenu);
  onContextMenuRef.current = onContextMenu;
  const isInteractingRef = useRef(false);

  const reportSelectionRect = useCallback(() => {
    const cb = onSelectionRectRef.current;
    if (!cb) return;
    const stage = stageRef.current;
    const state = useEditorStore.getState();
    if (
      !stage ||
      isInteractingRef.current ||
      state.selectedIds.length === 0 ||
      editingId ||
      handMode
    ) {
      cb(null);
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of state.selectedIds) {
      const node = stage.findOne(`#${id}`);
      if (!node) continue;
      const r = node.getClientRect({ relativeTo: stage, skipShadow: true });
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.width);
      maxY = Math.max(maxY, r.y + r.height);
    }
    if (!Number.isFinite(minX)) {
      cb(null);
      return;
    }
    cb({ x: minX, y: minY, width: maxX - minX, height: maxY - minY });
  }, [stageRef, editingId, handMode]);

  const reportRef = useRef(reportSelectionRect);
  reportRef.current = reportSelectionRect;

  useEffect(() => {
    reportSelectionRect();
  }, [
    reportSelectionRect,
    selectedIds,
    elements,
    zoom,
    panX,
    panY,
    containerWidth,
    containerHeight,
  ]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (panStart.current) return;
    stage.container().style.cursor = handMode ? "grab" : "default";
  }, [handMode, stageRef]);

  // Window-level pan move/end (catches releases outside the stage)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!panStart.current) return;
      const dx = e.clientX - panStart.current.clientX;
      const dy = e.clientY - panStart.current.clientY;
      useEditorStore
        .getState()
        .setPan(panStart.current.panX + dx, panStart.current.panY + dy);
    };
    const onUp = () => {
      if (!panStart.current) return;
      panStart.current = null;
      const stage = stageRef.current;
      if (stage) {
        stage.container().style.cursor = handMode ? "grab" : "default";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [handMode, stageRef]);

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return;
    const refresh = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const textNodes = stage.find("Text") as Konva.Text[];
      for (const t of textNodes) t.text(t.text());
      stage.batchDraw();
      // Re-fit auto-width text now that the real fonts are available.
      const state = useEditorStore.getState();
      for (const elx of state.elements) {
        if (elx.type !== "text") continue;
        if ((elx as TextElement).autoWidth === false) continue;
        const measured = Math.ceil(measureTextWidth(elx as TextElement));
        if (measured > 0 && Math.abs(measured - elx.width) > 1) {
          const factor = elx.align === "center" ? 0.5 : elx.align === "right" ? 1 : 0;
          state.updateElementSilent(elx.id, {
            width: measured,
            x: elx.x + (elx.width - measured) * factor,
          });
        }
      }
    };
    document.fonts.ready.then(refresh);
    document.fonts.addEventListener("loadingdone", refresh);
    return () => document.fonts.removeEventListener("loadingdone", refresh);
  }, [stageRef]);

  const isMarqueeTarget = useCallback(
    (target: Konva.Node | Konva.Stage): boolean => {
      const stage = stageRef.current;
      if (!stage) return false;
      if (target === stage) return true;
      if (target instanceof Konva.Node && target.id() === "bg-rect") return true;
      return false;
    },
    [stageRef]
  );

  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return;
      const evt = e.evt as MouseEvent;
      const isMiddleClick = "button" in evt && evt.button === 1;

      if (handMode || isMiddleClick) {
        if ("button" in evt && evt.button !== 0 && !isMiddleClick) return;
        evt.preventDefault?.();
        const state = useEditorStore.getState();
        panStart.current = {
          clientX: evt.clientX,
          clientY: evt.clientY,
          panX: state.panX,
          panY: state.panY,
        };
        stage.container().style.cursor = "grabbing";
        return;
      }

      if (!isMarqueeTarget(e.target)) return;
      if ("button" in evt && evt.button !== 0) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      marqueeAdditive.current = !!evt.shiftKey;
      marqueeBaseSelection.current = evt.shiftKey
        ? [...useEditorStore.getState().selectedIds]
        : [];
      setMarquee({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
    },
    [stageRef, isMarqueeTarget, handMode]
  );

  const handleStageMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (panStart.current) {
        const evt = e.evt as MouseEvent;
        const dx = evt.clientX - panStart.current.clientX;
        const dy = evt.clientY - panStart.current.clientY;
        useEditorStore
          .getState()
          .setPan(panStart.current.panX + dx, panStart.current.panY + dy);
        return;
      }
      if (!marquee) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      setMarquee((m) => (m ? { ...m, x2: pos.x, y2: pos.y } : m));
    },
    [marquee, stageRef]
  );

  const handleStageMouseUp = useCallback(() => {
    if (panStart.current) {
      panStart.current = null;
      const stage = stageRef.current;
      if (stage) {
        stage.container().style.cursor = handMode ? "grab" : "default";
      }
      return;
    }
    if (!marquee) return;
    const m = marquee;
    setMarquee(null);

    const minX = Math.min(m.x1, m.x2);
    const maxX = Math.max(m.x1, m.x2);
    const minY = Math.min(m.y1, m.y2);
    const maxY = Math.max(m.y1, m.y2);
    const dragDist = Math.hypot(maxX - minX, maxY - minY);

    if (dragDist < 3) {
      if (!marqueeAdditive.current) selectElement(null);
      return;
    }

    const canvasMinX = (minX - offsetX) / scale;
    const canvasMaxX = (maxX - offsetX) / scale;
    const canvasMinY = (minY - offsetY) / scale;
    const canvasMaxY = (maxY - offsetY) / scale;

    const state = useEditorStore.getState();
    const intersected: string[] = [];
    for (const el of state.elements) {
      if (el.hidden) continue;
      const elMaxX = el.x + el.width;
      const elMaxY = el.y + el.height;
      if (
        el.x < canvasMaxX &&
        elMaxX > canvasMinX &&
        el.y < canvasMaxY &&
        elMaxY > canvasMinY
      ) {
        intersected.push(el.id);
      }
    }

    if (marqueeAdditive.current) {
      const merged = new Set([...marqueeBaseSelection.current, ...intersected]);
      setSelectedIds([...merged]);
    } else {
      setSelectedIds(intersected);
    }
  }, [marquee, offsetX, offsetY, scale, selectElement, setSelectedIds, handMode, stageRef]);

  const handleElementSelect = useCallback(
    (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (handMode) return;
      const evt = e.evt as MouseEvent;
      selectElement(id, evt.shiftKey);
    },
    [selectElement, handMode]
  );

  const handleContextMenu = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.evt.preventDefault();
      const cb = onContextMenuRef.current;
      if (!cb || handMode) return;
      const stage = stageRef.current;
      if (!stage) return;
      const pos = stage.getPointerPosition();
      if (!pos) return;
      let targetId: string | null = null;
      const node = e.target;
      if (node && node !== stage) {
        const id = node.id();
        if (id && id !== "bg-rect") targetId = id;
      }
      if (targetId && !useEditorStore.getState().selectedIds.includes(targetId)) {
        selectElement(targetId, false);
      }
      cb({ x: pos.x, y: pos.y, targetId });
    },
    [handMode, stageRef, selectElement]
  );

  const makeDragHandlers = useCallback(
    (elId: string): DragHandlers => ({
      onDragStart: () => {
        isInteractingRef.current = true;
        onSelectionRectRef.current?.(null);
        const state = useEditorStore.getState();
        // For a multi-select drag, Konva's Transformer moves every selected
        // node together (proxy drag). We let it own the motion — computing our
        // own per-element deltas would fight it and scatter the elements.
        // Instead we snap the whole group's bounding box as a unit (see
        // onDragMove), so cache the alignment context here.
        if (state.selectedIds.length > 1 && state.selectedIds.includes(elId)) {
          snapData.current = null;
          const selectedSet = new Set(state.selectedIds);
          const dims = new Map<string, { width: number; height: number }>();
          const others: BBox[] = [];
          for (const x of state.elements) {
            if (x.hidden) continue;
            if (selectedSet.has(x.id)) {
              dims.set(x.id, { width: x.width, height: x.height });
            } else {
              others.push({ x: x.x, y: x.y, width: x.width, height: x.height });
            }
          }
          groupSnap.current = { dims, others };
          return;
        }
        const draggedEl = state.elements.find((x) => x.id === elId);
        if (draggedEl) {
          const others: BBox[] = state.elements
            .filter((x) => !x.hidden && x.id !== elId)
            .map((x) => ({ x: x.x, y: x.y, width: x.width, height: x.height }));
          snapData.current = {
            width: draggedEl.width,
            height: draggedEl.height,
            others,
          };
        }
      },
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
        const setSnapGuides = (snapGuides: Guide[]) =>
          setGuides((prev) => {
            if (
              prev.length === snapGuides.length &&
              prev.every(
                (g, i) =>
                  g.orientation === snapGuides[i].orientation &&
                  g.pos === snapGuides[i].pos
              )
            ) {
              return prev;
            }
            return snapGuides;
          });

        // Multi-select: snap the group's combined bounding box and shift every
        // selected node by the same delta so they stay locked together.
        if (groupSnap.current) {
          const stage = stageRef.current;
          if (!stage) return;
          const ids = useEditorStore.getState().selectedIds;
          // Konva positions every dragging node before firing any dragmove
          // (DragAndDrop._drag), so by now all siblings are at their new spot.
          // Let only the first dragging node drive the snap — once per frame.
          const driver = ids.find((id) => stage.findOne(`#${id}`)?.isDragging());
          if (driver !== elId) return;

          const nodes: Konva.Node[] = [];
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          for (const id of ids) {
            const node = stage.findOne(`#${id}`);
            const dim = groupSnap.current.dims.get(id);
            if (!node || !dim) continue;
            nodes.push(node);
            minX = Math.min(minX, node.x());
            minY = Math.min(minY, node.y());
            maxX = Math.max(maxX, node.x() + dim.width);
            maxY = Math.max(maxY, node.y() + dim.height);
          }
          if (!Number.isFinite(minX)) return;

          const z = useEditorStore.getState().zoom / 100;
          const snap = computeSnap(
            { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
            groupSnap.current.others,
            { width: format.width, height: format.height },
            6 / z
          );
          const dx = snap.x - minX;
          const dy = snap.y - minY;
          if (dx !== 0 || dy !== 0) {
            for (const node of nodes) {
              node.x(node.x() + dx);
              node.y(node.y() + dy);
            }
            stage.batchDraw();
          }
          setSnapGuides(snap.guides);
          return;
        }

        // Single-select snap (snapData is null during a group drag).
        if (!snapData.current) return;
        const proposed: BBox = {
          x: e.target.x(),
          y: e.target.y(),
          width: snapData.current.width,
          height: snapData.current.height,
        };
        const z = useEditorStore.getState().zoom / 100;
        const snap = computeSnap(
          proposed,
          snapData.current.others,
          { width: format.width, height: format.height },
          6 / z
        );
        if (snap.x !== proposed.x || snap.y !== proposed.y) {
          e.target.position({ x: snap.x, y: snap.y });
        }
        setSnapGuides(snap.guides);
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        setGuides([]);
        snapData.current = null;
        groupSnap.current = null;
        isInteractingRef.current = false;
        requestAnimationFrame(() => reportRef.current());

        const ids = useEditorStore.getState().selectedIds;
        if (ids.length > 1 && ids.includes(elId)) {
          // Every node in the group fires its own dragend; commit them all in a
          // single batched update so undo treats the move as one step. The
          // guard + rAF dedupe the concurrent dragends into one commit that
          // reads each node's actual final position straight from Konva.
          if (groupCommitScheduled.current) return;
          groupCommitScheduled.current = true;
          requestAnimationFrame(() => {
            groupCommitScheduled.current = false;
            const stage = stageRef.current;
            if (!stage) return;
            const updates = new Map<string, Partial<EditorElement>>();
            for (const id of useEditorStore.getState().selectedIds) {
              const node = stage.findOne(`#${id}`);
              if (node) updates.set(id, { x: node.x(), y: node.y() });
            }
            if (updates.size > 0) {
              useEditorStore.getState().updateMultipleElements(updates);
            }
          });
          return;
        }

        useEditorStore.getState().updateElement(elId, {
          x: e.target.x(),
          y: e.target.y(),
        });
      },
    }),
    [stageRef, format.width, format.height]
  );

  const visibleElements = elements.filter((el) => !el.hidden);
  const singleSelected =
    selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : null;
  const isSingleText = singleSelected?.type === "text";

  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={containerHeight}
      onMouseDown={handleStageMouseDown}
      onTouchStart={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onTouchMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onTouchEnd={handleStageMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Background layer */}
      <Layer>
        <Rect
          id="bg-rect"
          x={offsetX}
          y={offsetY}
          width={format.width * scale}
          height={format.height * scale}
          {...(backgroundGradient
            ? backgroundGradient.type === "linear"
              ? {
                  fillLinearGradientStartPoint: {
                    x: backgroundGradient.startX * format.width * scale,
                    y: backgroundGradient.startY * format.height * scale,
                  },
                  fillLinearGradientEndPoint: {
                    x: backgroundGradient.endX * format.width * scale,
                    y: backgroundGradient.endY * format.height * scale,
                  },
                  fillLinearGradientColorStops: backgroundGradient.colorStops,
                }
              : {
                  fillRadialGradientStartPoint: {
                    x: backgroundGradient.startX * format.width * scale,
                    y: backgroundGradient.startY * format.height * scale,
                  },
                  fillRadialGradientEndPoint: {
                    x: backgroundGradient.endX * format.width * scale,
                    y: backgroundGradient.endY * format.height * scale,
                  },
                  fillRadialGradientStartRadius:
                    (backgroundGradient.startRadius ?? 0) *
                    Math.max(format.width, format.height) *
                    scale,
                  fillRadialGradientEndRadius:
                    (backgroundGradient.endRadius ?? 0.7) *
                    Math.max(format.width, format.height) *
                    scale,
                  fillRadialGradientColorStops: backgroundGradient.colorStops,
                }
            : { fill: backgroundColor })}
          shadowColor="rgba(0,0,0,0.5)"
          shadowBlur={40}
          shadowOffsetY={8}
          cornerRadius={2}
        />
      </Layer>

      {/* Elements layer */}
      <Layer
        x={offsetX}
        y={offsetY}
        scaleX={scale}
        scaleY={scale}
        clipX={0}
        clipY={0}
        clipWidth={format.width}
        clipHeight={format.height}
      >
        {visibleElements.map((el) => {
          const isSelected = selectedIds.includes(el.id);
          const onSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) =>
            handleElementSelect(el.id, e);
          const drag = makeDragHandlers(el.id);

          switch (el.type) {
            case "shape":
              return (
                <ShapeNode
                  key={el.id}
                  el={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  drag={drag}
                  disableDrag={handMode}
                />
              );
            case "text":
              return (
                <TextNode
                  key={el.id}
                  el={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  drag={drag}
                  onStartEditing={onStartEditing}
                  isEditing={editingId === el.id}
                  disableDrag={handMode}
                />
              );
            case "image":
              return (
                <ImageNode
                  key={el.id}
                  el={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  drag={drag}
                  disableDrag={handMode}
                />
              );
            default:
              return null;
          }
        })}
        {guides.map((g, i) => (
          <Line
            key={`${g.orientation}-${i}-${g.pos}`}
            points={
              g.orientation === "v"
                ? [g.pos, g.start, g.pos, g.end]
                : [g.start, g.pos, g.end, g.pos]
            }
            stroke="#FF00B8"
            strokeWidth={1 / scale}
            dash={[6 / scale, 4 / scale]}
            listening={false}
          />
        ))}
        <Transformer
          ref={transformerRef}
          // With >1 element selected, make the whole selection bounding box a
          // drag handle so the user can grab the group anywhere inside it
          // (including empty gaps) instead of having to hit an element exactly.
          shouldOverdrawWholeArea={selectedIds.length > 1}
          onTransformStart={() => {
            isInteractingRef.current = true;
            onSelectionRectRef.current?.(null);
          }}
          onTransformEnd={() => {
            setGuides([]);
            isInteractingRef.current = false;
            requestAnimationFrame(() => reportRef.current());
          }}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            // Skip snap when rotated — bbox geometry gets complex
            if (Math.abs(newBox.rotation) > 0.01) {
              return newBox;
            }
            const state = useEditorStore.getState();
            const selectedSet = new Set(state.selectedIds);
            const others: BBox[] = state.elements
              .filter((x) => !x.hidden && !selectedSet.has(x.id))
              .map((x) => ({ x: x.x, y: x.y, width: x.width, height: x.height }));
            const threshold = 6 / (state.zoom / 100);
            const result = snapResize(
              oldBox,
              newBox,
              others,
              { width: format.width, height: format.height },
              threshold
            );
            if (result.box.width < 5 || result.box.height < 5) {
              setGuides([]);
              return newBox;
            }
            setGuides((prev) => {
              if (
                prev.length === result.guides.length &&
                prev.every(
                  (g, i) =>
                    g.orientation === result.guides[i].orientation &&
                    g.pos === result.guides[i].pos
                )
              ) {
                return prev;
              }
              return result.guides;
            });
            return { ...result.box, rotation: newBox.rotation };
          }}
          anchorSize={8}
          anchorCornerRadius={2}
          borderStroke="#34d399"
          anchorStroke="#34d399"
          anchorFill="#0c0c0c"
          rotateAnchorOffset={20}
          rotateAnchorAngle={180}
          enabledAnchors={
            isSingleText
              ? [
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                  "middle-left",
                  "middle-right",
                ]
              : [
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                  "middle-left",
                  "middle-right",
                  "top-center",
                  "bottom-center",
                ]
          }
        />
      </Layer>

      {/* Marquee overlay (screen coords) */}
      {marquee && (
        <Layer listening={false}>
          <Rect
            x={Math.min(marquee.x1, marquee.x2)}
            y={Math.min(marquee.y1, marquee.y2)}
            width={Math.abs(marquee.x2 - marquee.x1)}
            height={Math.abs(marquee.y2 - marquee.y1)}
            fill="rgba(52, 211, 153, 0.12)"
            stroke="#34d399"
            strokeWidth={1}
            dash={[4, 3]}
          />
        </Layer>
      )}
    </Stage>
  );
}
