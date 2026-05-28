"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Image, Transformer, Line } from "react-konva";
import Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
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
}: {
  el: ImageElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  drag: DragHandlers;
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
      draggable={!el.locked}
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
}: {
  el: ShapeElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  drag: DragHandlers;
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
    draggable: !el.locked,
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

function TextNode({
  el,
  onSelect,
  drag,
  onStartEditing,
  isEditing,
}: {
  el: TextElement;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  drag: DragHandlers;
  onStartEditing: (req: InlineEditRequest) => void;
  isEditing: boolean;
}) {
  const shapeRef = useRef<Konva.Text>(null);

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
      fontFamily={el.fontFamily}
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
      draggable={!el.locked && !isEditing}
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
        useEditorStore.getState().updateElement(el.id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          fontSize: Math.max(8, el.fontSize * scaleY),
          rotation: node.rotation(),
        });
      }}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
    />
  );
}

export default function CanvasStage({
  stageRef,
  containerWidth,
  containerHeight,
  onStartEditing,
  editingId,
}: {
  stageRef: React.RefObject<Konva.Stage | null>;
  containerWidth: number;
  containerHeight: number;
  onStartEditing: (req: InlineEditRequest) => void;
  editingId: string | null;
}) {
  const elements = useEditorStore((s) => s.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const selectElement = useEditorStore((s) => s.selectElement);

  const transformerRef = useRef<Konva.Transformer>(null);
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const snapData = useRef<{ width: number; height: number; others: BBox[] } | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);

  const scale = zoom / 100;

  const offsetX = (containerWidth - format.width * scale) / 2;
  const offsetY = (containerHeight - format.height * scale) / 2;

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

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        selectElement(null);
      }
    },
    [selectElement]
  );

  const handleElementSelect = useCallback(
    (id: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const evt = e.evt as MouseEvent;
      selectElement(id, evt.shiftKey);
    },
    [selectElement]
  );

  const makeDragHandlers = useCallback(
    (elId: string): DragHandlers => ({
      onDragStart: (e: Konva.KonvaEventObject<DragEvent>) => {
        const state = useEditorStore.getState();
        const draggedEl = state.elements.find((x) => x.id === elId);
        if (draggedEl) {
          const selectedSet = new Set(state.selectedIds);
          const others: BBox[] = state.elements
            .filter((x) => !x.hidden && !selectedSet.has(x.id) && x.id !== elId)
            .map((x) => ({ x: x.x, y: x.y, width: x.width, height: x.height }));
          snapData.current = {
            width: draggedEl.width,
            height: draggedEl.height,
            others,
          };
        }

        const ids = state.selectedIds;
        if (!ids.includes(elId) || ids.length <= 1) {
          dragOrigin.current = { x: e.target.x(), y: e.target.y() };
          return;
        }
        const stage = stageRef.current;
        if (!stage) return;
        const positions = new Map<string, { x: number; y: number }>();
        for (const id of ids) {
          if (id === elId) continue;
          const node = stage.findOne(`#${id}`);
          if (node) positions.set(id, { x: node.x(), y: node.y() });
        }
        dragStartPositions.current = positions;
        dragOrigin.current = { x: e.target.x(), y: e.target.y() };
      },
      onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => {
        // Snap (works for both single and multi-select)
        if (snapData.current) {
          const proposed: BBox = {
            x: e.target.x(),
            y: e.target.y(),
            width: snapData.current.width,
            height: snapData.current.height,
          };
          const z = useEditorStore.getState().zoom / 100;
          const threshold = 6 / z;
          const snap = computeSnap(
            proposed,
            snapData.current.others,
            { width: format.width, height: format.height },
            threshold
          );
          if (snap.x !== proposed.x || snap.y !== proposed.y) {
            e.target.position({ x: snap.x, y: snap.y });
          }
          setGuides((prev) => {
            if (
              prev.length === snap.guides.length &&
              prev.every(
                (g, i) =>
                  g.orientation === snap.guides[i].orientation &&
                  g.pos === snap.guides[i].pos
              )
            ) {
              return prev;
            }
            return snap.guides;
          });
        }

        // Group drag — move other selected nodes by the (snapped) delta
        const ids = useEditorStore.getState().selectedIds;
        if (!ids.includes(elId) || ids.length <= 1 || !dragOrigin.current) return;
        const dx = e.target.x() - dragOrigin.current.x;
        const dy = e.target.y() - dragOrigin.current.y;
        const stage = stageRef.current;
        if (!stage) return;
        for (const [id, pos] of dragStartPositions.current) {
          const other = stage.findOne(`#${id}`);
          if (other) {
            other.x(pos.x + dx);
            other.y(pos.y + dy);
          }
        }
        stage.batchDraw();
      },
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        setGuides([]);
        snapData.current = null;
        const ids = useEditorStore.getState().selectedIds;
        if (!ids.includes(elId) || ids.length <= 1 || !dragOrigin.current) {
          useEditorStore.getState().updateElement(elId, {
            x: e.target.x(),
            y: e.target.y(),
          });
          dragOrigin.current = null;
          return;
        }
        const dx = e.target.x() - dragOrigin.current.x;
        const dy = e.target.y() - dragOrigin.current.y;
        const updates = new Map<string, Partial<EditorElement>>();
        updates.set(elId, { x: e.target.x(), y: e.target.y() });
        for (const [id, pos] of dragStartPositions.current) {
          updates.set(id, { x: pos.x + dx, y: pos.y + dy });
        }
        useEditorStore.getState().updateMultipleElements(updates);
        dragStartPositions.current.clear();
        dragOrigin.current = null;
      },
    }),
    [stageRef, format.width, format.height]
  );

  const visibleElements = elements.filter((el) => !el.hidden);

  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={containerHeight}
      onClick={handleStageClick}
      onTap={handleStageClick}
    >
      {/* Background layer */}
      <Layer>
        <Rect
          x={offsetX}
          y={offsetY}
          width={format.width * scale}
          height={format.height * scale}
          fill={backgroundColor}
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
          onTransformEnd={() => setGuides([])}
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
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
        />
      </Layer>
    </Stage>
  );
}
