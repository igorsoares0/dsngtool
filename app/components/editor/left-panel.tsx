"use client";

import { PlusIcon } from "./icons";

type PanelType =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "images"
  | "assets"
  | "overlays";

const TEMPLATE_THUMBNAILS = [
  { id: 1, label: "Minimal Story", color: "#1e293b" },
  { id: 2, label: "Bold Promo", color: "#7c3aed" },
  { id: 3, label: "Food Post", color: "#ea580c" },
  { id: 4, label: "Fitness Dark", color: "#0f172a" },
  { id: 5, label: "Fashion Light", color: "#fbbf24" },
  { id: 6, label: "Modern Business", color: "#0ea5e9" },
];

const SHAPE_OPTIONS = [
  { id: "rect", label: "Rectangle", preview: "rounded-sm" },
  { id: "ellipse", label: "Ellipse", preview: "rounded-full" },
  { id: "triangle", label: "Triangle", preview: "" },
];

function TemplatesPanel() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
          Templates
        </h3>
        <span className="text-[10px] text-text-ghost bg-surface-3 px-1.5 py-0.5 rounded">
          {TEMPLATE_THUMBNAILS.length}
        </span>
      </div>
      <input
        type="text"
        placeholder="Search templates..."
        className="w-full bg-surface-2 border border-border-subtle text-xs text-text-primary placeholder:text-text-ghost px-3 py-2 rounded-md outline-none focus:border-accent-green/40 transition-colors"
      />
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATE_THUMBNAILS.map((t) => (
          <button
            key={t.id}
            className="group aspect-[3/4] rounded-lg overflow-hidden border border-border-subtle hover:border-accent-green/40 transition-all relative"
            style={{ backgroundColor: t.color }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="absolute bottom-2 left-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UploadsPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Uploads
      </h3>
      <button className="w-full border border-dashed border-border-strong rounded-lg py-8 flex flex-col items-center gap-2 text-text-tertiary hover:text-text-secondary hover:border-accent-green/30 transition-all group">
        <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center group-hover:bg-surface-4 transition-colors">
          <PlusIcon className="w-5 h-5" />
        </div>
        <span className="text-xs">Upload image</span>
        <span className="text-[10px] text-text-ghost">or drag & drop</span>
      </button>
    </div>
  );
}

function TextPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Text
      </h3>
      <div className="space-y-2">
        <button className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg px-4 py-3 transition-all group">
          <span className="text-lg font-bold text-text-primary font-[family-name:var(--font-dm-sans)]">
            Add a heading
          </span>
        </button>
        <button className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg px-4 py-3 transition-all group">
          <span className="text-sm font-medium text-text-secondary">
            Add a subheading
          </span>
        </button>
        <button className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-lg px-4 py-2.5 transition-all group">
          <span className="text-xs text-text-tertiary">Add body text</span>
        </button>
      </div>
    </div>
  );
}

function ShapesPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Shapes
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {SHAPE_OPTIONS.map((shape) => (
          <button
            key={shape.id}
            className="aspect-square bg-surface-2 border border-border-subtle rounded-lg flex items-center justify-center hover:border-accent-green/40 hover:bg-surface-3 transition-all group"
          >
            {shape.id === "triangle" ? (
              <div
                className="w-8 h-8 bg-text-tertiary group-hover:bg-accent-green transition-colors"
                style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
              />
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
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="aspect-square bg-surface-3 rounded-lg border border-border-subtle animate-pulse"
          />
        ))}
      </div>
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

function OverlaysPanel() {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Overlays
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Gradient", bg: "bg-gradient-to-br from-purple-600/50 to-blue-600/50" },
          { label: "Light Leak", bg: "bg-gradient-to-tr from-orange-500/40 to-yellow-300/30" },
          { label: "Grain", bg: "bg-surface-3" },
          { label: "Blur", bg: "bg-gradient-to-b from-white/10 to-white/5" },
        ].map((overlay) => (
          <button
            key={overlay.label}
            className={`aspect-video ${overlay.bg} rounded-lg border border-border-subtle hover:border-accent-green/40 transition-all flex items-end p-2`}
          >
            <span className="text-[10px] text-text-secondary">{overlay.label}</span>
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
