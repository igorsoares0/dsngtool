"use client";

import { useRef, useEffect, useCallback } from "react";
import { Stage, Layer, Rect, Ellipse, Text, Image, Transformer, Line } from "react-konva";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import type { EditorElement, ShapeElement, TextElement, ImageElement } from "../../types/editor";

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

function useImage(src: string): HTMLImageElement | null {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const mountedRef = useRef(true);

  if (!imgRef.current && typeof window !== "undefined") {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      if (mountedRef.current) {
        imgRef.current = img;
      }
    };
  }

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return imgRef.current;
}

function ImageNode({
  el,
  onSelect,
  onChange,
}: {
  el: ImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<EditorElement>) => void;
}) {
  const shapeRef = useRef<Konva.Image>(null);
  const image = useImage(el.src);

  return (
    <Image
      ref={shapeRef}
      image={image || undefined}
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      rotation={el.rotation}
      opacity={el.opacity}
      draggable={!el.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

function ShapeNode({
  el,
  onSelect,
  onChange,
}: {
  el: ShapeElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<EditorElement>) => void;
}) {
  const shapeRef = useRef<Konva.Rect | Konva.Ellipse | Konva.Line>(null);

  const commonProps = {
    id: el.id,
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: el.opacity,
    fill: el.fill,
    stroke: el.stroke,
    strokeWidth: el.strokeWidth || 0,
    draggable: !el.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange({ x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: () => {
      const node = shapeRef.current;
      if (!node) return;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange({
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
  onChange,
  onStartEditing,
  isEditing,
}: {
  el: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<EditorElement>) => void;
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
      text={el.text}
      fontSize={el.fontSize}
      fontFamily={el.fontFamily}
      fill={el.fill}
      align={el.align}
      fontStyle={el.fontStyle || "normal"}
      textDecoration={el.textDecoration || ""}
      lineHeight={el.lineHeight || 1.2}
      letterSpacing={el.letterSpacing || 0}
      rotation={el.rotation}
      opacity={isEditing ? 0 : el.opacity}
      draggable={!el.locked && !isEditing}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() });
      }}
      onTransformEnd={() => {
        const node = shapeRef.current;
        if (!node) return;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
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
  const selectedId = useEditorStore((s) => s.selectedId);
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);

  const transformerRef = useRef<Konva.Transformer>(null);

  const scale = zoom / 100;

  const offsetX = (containerWidth - format.width * scale) / 2;
  const offsetY = (containerHeight - format.height * scale) / 2;

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (selectedId && !editingId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node]);
        tr.getLayer()?.batchDraw();
        return;
      }
    }
    tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, elements, stageRef, editingId]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (e.target === e.target.getStage()) {
        selectElement(null);
      }
    },
    [selectElement]
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
          fill="#ffffff"
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
          const isSelected = el.id === selectedId;
          const onChange = (updates: Partial<EditorElement>) =>
            updateElement(el.id, updates);
          const onSelect = () => selectElement(el.id);

          switch (el.type) {
            case "shape":
              return (
                <ShapeNode
                  key={el.id}
                  el={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  onChange={onChange}
                />
              );
            case "text":
              return (
                <TextNode
                  key={el.id}
                  el={el}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  onChange={onChange}
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
                  onChange={onChange}
                />
              );
            default:
              return null;
          }
        })}
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
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
