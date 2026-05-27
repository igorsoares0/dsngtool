export interface BaseElement {
  id: string;
  type: "text" | "image" | "shape";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: "left" | "center" | "right";
  fontStyle?: string;
  textDecoration?: string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shapeType: "rectangle" | "ellipse" | "triangle";
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export type EditorElement = TextElement | ImageElement | ShapeElement;

export interface CanvasFormat {
  label: string;
  width: number;
  height: number;
}

export const CANVAS_FORMATS: CanvasFormat[] = [
  { label: "Instagram Post", width: 1080, height: 1080 },
  { label: "Instagram Story", width: 1080, height: 1920 },
  { label: "Pinterest", width: 1000, height: 1500 },
];
