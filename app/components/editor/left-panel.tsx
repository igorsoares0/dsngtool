"use client";

import { useEditorStore } from "../../store/editor-store";
import { TEMPLATES } from "../../data/templates";
import { PlusIcon } from "./icons";
import type { EditorElement } from "../../types/editor";

type PanelType =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "images"
  | "assets"
  | "overlays";

function TemplatePreview({ bgColor, accent, isStory }: { bgColor: string; accent: string; isStory?: boolean }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 gap-1.5">
      {/* Mini decorative line */}
      <div className="w-8 h-px opacity-40" style={{ backgroundColor: accent }} />
      {/* Fake heading lines */}
      <div className="w-12 h-1 rounded-full opacity-60" style={{ backgroundColor: accent }} />
      <div className="w-16 h-1 rounded-full opacity-40" style={{ backgroundColor: accent }} />
      {/* Small diamond */}
      <div
        className="w-1.5 h-1.5 rotate-45 opacity-30 mt-1"
        style={{ backgroundColor: accent }}
      />
      {/* Fake body lines */}
      <div className="w-14 h-0.5 rounded-full opacity-20 mt-1" style={{ backgroundColor: accent }} />
      <div className="w-10 h-0.5 rounded-full opacity-20" style={{ backgroundColor: accent }} />
    </div>
  );
}

function TemplatesPanel() {
  const loadTemplate = useEditorStore((s) => s.loadTemplate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Templates
        </h3>
        <span className="text-[10px] text-text-ghost bg-surface-3 px-1.5 py-0.5 rounded">
          {TEMPLATES.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => {
          const ratio = t.format.width / t.format.height;
          const aspectClass =
            ratio === 1 ? "aspect-square" : ratio < 0.6 ? "aspect-[9/16]" : "aspect-[2/3]";
          const isPortrait = ratio < 1;
          return (
            <button
              key={t.name}
              onClick={() => loadTemplate(t)}
              className={`group rounded-lg overflow-hidden border border-border-subtle hover:border-accent-green/40 transition-all relative ${aspectClass}`}
              style={{ backgroundColor: t.previewColor }}
            >
              <TemplatePreview
                bgColor={t.previewColor}
                accent={t.previewAccent}
                isStory={isPortrait}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white font-medium block">
                  {t.name}
                </span>
                <span className="text-[9px] text-white/60">
                  {t.format.width}×{t.format.height}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UploadsPanel() {
  const addElement = useEditorStore((s) => s.addElement);
  const format = useEditorStore((s) => s.format);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new window.Image();
      img.onload = () => {
        const maxW = format.width * 0.6;
        const ratio = img.width / img.height;
        const w = Math.min(img.width, maxW);
        const h = w / ratio;
        addElement({
          type: "image",
          src,
          x: (format.width - w) / 2,
          y: (format.height - h) / 2,
          width: w,
          height: h,
          rotation: 0,
          opacity: 1,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Uploads
      </h3>
      <label className="w-full border border-dashed border-border-strong rounded-lg py-8 flex flex-col items-center gap-2 text-text-tertiary hover:text-text-secondary hover:border-accent-green/30 transition-all group cursor-pointer">
        <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center group-hover:bg-surface-4 transition-colors">
          <PlusIcon className="w-5 h-5" />
        </div>
        <span className="text-xs">Upload image</span>
        <span className="text-[10px] text-text-ghost">or drag & drop</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
        />
      </label>
    </div>
  );
}

function TextPanel() {
  const addElement = useEditorStore((s) => s.addElement);
  const format = useEditorStore((s) => s.format);

  const addText = (preset: "heading" | "subheading" | "body") => {
    const configs = {
      heading: { text: "Add a heading", fontSize: 64, fontStyle: "bold", fontFamily: "Playfair Display" },
      subheading: { text: "Add a subheading", fontSize: 40, fontStyle: "500", fontFamily: "Montserrat" },
      body: { text: "Add body text", fontSize: 24, fontStyle: "normal", fontFamily: "DM Sans" },
    };
    const cfg = configs[preset];
    addElement({
      type: "text",
      text: cfg.text,
      fontSize: cfg.fontSize,
      fontFamily: cfg.fontFamily,
      fill: "#000000",
      align: "center",
      fontStyle: cfg.fontStyle,
      width: format.width * 0.6,
      height: cfg.fontSize * 1.5,
      x: format.width * 0.2,
      y: format.height / 2 - cfg.fontSize,
      rotation: 0,
      opacity: 1,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Text
      </h3>
      <div className="space-y-2">
        <button
          onClick={() => addText("heading")}
          className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg px-4 py-3 transition-all"
        >
          <span className="text-lg font-bold text-text-primary font-[family-name:var(--font-dm-sans)]">
            Add a heading
          </span>
        </button>
        <button
          onClick={() => addText("subheading")}
          className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg px-4 py-3 transition-all"
        >
          <span className="text-sm font-medium text-text-secondary">
            Add a subheading
          </span>
        </button>
        <button
          onClick={() => addText("body")}
          className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg px-4 py-2.5 transition-all"
        >
          <span className="text-xs text-text-tertiary">Add body text</span>
        </button>
      </div>
    </div>
  );
}

function ShapesPanel() {
  const addElement = useEditorStore((s) => s.addElement);
  const format = useEditorStore((s) => s.format);

  const addShape = (shapeType: "rectangle" | "ellipse" | "triangle" | "line") => {
    if (shapeType === "line") {
      const length = Math.min(format.width, format.height) * 0.4;
      const thickness = 4;
      addElement({
        type: "shape",
        shapeType: "line",
        fill: "#000000",
        stroke: "#000000",
        strokeWidth: thickness,
        x: (format.width - length) / 2,
        y: (format.height - thickness) / 2,
        width: length,
        height: thickness,
        rotation: 0,
        opacity: 1,
      });
      return;
    }
    const size = Math.min(format.width, format.height) * 0.25;
    addElement({
      type: "shape",
      shapeType,
      fill: "#6366f1",
      x: (format.width - size) / 2,
      y: (format.height - size) / 2,
      width: size,
      height: size,
      rotation: 0,
      opacity: 1,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Shapes
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {([
          { id: "rectangle" as const, preview: "rounded-sm" },
          { id: "ellipse" as const, preview: "rounded-full" },
          { id: "triangle" as const, preview: "" },
          { id: "line" as const, preview: "" },
        ]).map((shape) => (
          <button
            key={shape.id}
            onClick={() => addShape(shape.id)}
            className="aspect-square bg-surface-2 border border-border-subtle rounded-lg flex items-center justify-center hover:border-accent-green/40 hover:bg-surface-3 transition-all group"
          >
            {shape.id === "triangle" ? (
              <div
                className="w-8 h-8 bg-text-tertiary group-hover:bg-accent-green transition-colors"
                style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
              />
            ) : shape.id === "line" ? (
              <div className="w-8 h-[3px] bg-text-tertiary group-hover:bg-accent-green transition-colors rounded-full" />
            ) : (
              <div
                className={`w-8 h-8 bg-text-tertiary group-hover:bg-accent-green transition-colors ${shape.preview}`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ImagesPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Images
      </h3>
      <input
        type="text"
        placeholder="Search free images..."
        className="w-full bg-surface-2 border border-border-subtle text-xs text-text-primary placeholder:text-text-ghost px-3 py-2 rounded-md outline-none focus:border-accent-green/40 transition-colors"
      />
      <p className="text-[11px] text-text-ghost text-center py-6">
        Image search coming soon
      </p>
    </div>
  );
}

function AssetsPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Assets
      </h3>
      <input
        type="text"
        placeholder="Search stickers & icons..."
        className="w-full bg-surface-2 border border-border-subtle text-xs text-text-primary placeholder:text-text-ghost px-3 py-2 rounded-md outline-none focus:border-accent-green/40 transition-colors"
      />
      <p className="text-[11px] text-text-ghost text-center py-6">
        Asset library coming soon
      </p>
    </div>
  );
}

type OverlayPreset = {
  label: string;
  preview: string;
  build: (canvas: { width: number; height: number }) => {
    type: "shape";
    shapeType: "rectangle" | "ellipse";
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    fill: string;
    gradient?: import("../../types/editor").GradientFill;
  };
};

const OVERLAY_PRESETS: OverlayPreset[] = [
  {
    label: "Purple Glow",
    preview: "linear-gradient(135deg,#7C3AED 0%,#EC4899 100%)",
    build: (c) => ({
      type: "shape",
      shapeType: "rectangle",
      x: 0,
      y: 0,
      width: c.width,
      height: c.height,
      rotation: 0,
      opacity: 0.55,
      fill: "#7C3AED",
      gradient: {
        type: "linear",
        startX: 0, startY: 0, endX: 1, endY: 1,
        colorStops: [0, "#7C3AED", 1, "#EC4899"],
      },
    }),
  },
  {
    label: "Sunset",
    preview: "linear-gradient(180deg,#F97316 0%,#EC4899 60%,#7C3AED 100%)",
    build: (c) => ({
      type: "shape",
      shapeType: "rectangle",
      x: 0, y: 0, width: c.width, height: c.height,
      rotation: 0, opacity: 0.6, fill: "#F97316",
      gradient: {
        type: "linear",
        startX: 0, startY: 0, endX: 0, endY: 1,
        colorStops: [0, "#F97316", 1, "#7C3AED"],
      },
    }),
  },
  {
    label: "Ocean",
    preview: "linear-gradient(135deg,#0EA5E9 0%,#10B981 100%)",
    build: (c) => ({
      type: "shape",
      shapeType: "rectangle",
      x: 0, y: 0, width: c.width, height: c.height,
      rotation: 0, opacity: 0.55, fill: "#0EA5E9",
      gradient: {
        type: "linear",
        startX: 0, startY: 0, endX: 1, endY: 1,
        colorStops: [0, "#0EA5E9", 1, "#10B981"],
      },
    }),
  },
  {
    label: "Light Leak",
    preview: "radial-gradient(circle at 20% 30%,#FBBF24 0%,#F97316 35%,transparent 70%)",
    build: (c) => ({
      type: "shape",
      shapeType: "rectangle",
      x: 0, y: 0, width: c.width, height: c.height,
      rotation: 0, opacity: 0.7, fill: "#F97316",
      gradient: {
        type: "radial",
        startX: 0.2, startY: 0.3, endX: 0.2, endY: 0.3,
        startRadius: 0, endRadius: 0.9,
        colorStops: [0, "#FBBF24", 0.5, "rgba(249,115,22,0.5)", 1, "rgba(249,115,22,0)"],
      },
    }),
  },
  {
    label: "Vignette",
    preview: "radial-gradient(circle,transparent 40%,#000 100%)",
    build: (c) => ({
      type: "shape",
      shapeType: "rectangle",
      x: 0, y: 0, width: c.width, height: c.height,
      rotation: 0, opacity: 1, fill: "#000000",
      gradient: {
        type: "radial",
        startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5,
        startRadius: 0.3, endRadius: 0.75,
        colorStops: [0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.85)"],
      },
    }),
  },
  {
    label: "Warm Tint",
    preview: "linear-gradient(0deg,#F59E0B 0%,#F59E0B 100%)",
    build: (c) => ({
      type: "shape",
      shapeType: "rectangle",
      x: 0, y: 0, width: c.width, height: c.height,
      rotation: 0, opacity: 0.25, fill: "#F59E0B",
    }),
  },
];

function OverlaysPanel() {
  const addElement = useEditorStore((s) => s.addElement);
  const format = useEditorStore((s) => s.format);

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Overlays
      </h3>
      <p className="text-[10px] text-text-ghost leading-relaxed">
        Click any preset to add a full-canvas overlay layer. Adjust opacity and color in the right panel.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OVERLAY_PRESETS.map((overlay) => (
          <button
            key={overlay.label}
            onClick={() => addElement(overlay.build({ width: format.width, height: format.height }))}
            className="aspect-video rounded-lg border border-border-subtle hover:border-accent-green/40 transition-all flex items-end p-2 overflow-hidden relative group"
            style={{ background: overlay.preview }}
          >
            <span className="text-[10px] text-white font-medium relative z-10 drop-shadow">
              {overlay.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const PANELS: Record<PanelType, () => React.JSX.Element> = {
  templates: TemplatesPanel,
  uploads: UploadsPanel,
  text: TextPanel,
  shapes: ShapesPanel,
  images: ImagesPanel,
  assets: AssetsPanel,
  overlays: OverlaysPanel,
};

export default function LeftPanel({ activePanel }: { activePanel: PanelType | null }) {
  if (!activePanel) return null;

  const PanelContent = PANELS[activePanel];

  return (
    <div className="w-[260px] bg-surface-1 border-r border-border-subtle p-4 overflow-y-auto shrink-0 animate-fade-in">
      <PanelContent />
    </div>
  );
}
