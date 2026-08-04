"use client";

import { useMemo, useState } from "react";
import { useEditorStore } from "../../store/editor-store";
import { useEntitlementStore } from "../../store/entitlement-store";
import { TEMPLATES } from "../../data/templates";
import { ASSETS } from "../../data/assets";
import { LockIcon, UploadIcon, SearchIcon } from "./icons";
import { cx } from "../ui/cx";
import { toast } from "../../store/toast-store";

/** Read an image file's natural pixel dimensions in the browser. */
function imageDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode_failed"));
    };
    img.src = url;
  });
}

type PanelType =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
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

/** Chips come from the template data itself, so they can't drift out of step
 *  with the list — but the data carries ~40 categories, which is a wall, not a
 *  filter. Show the handful with the most templates behind them; everything
 *  else is still reachable through search. */
const CHIP_LIMIT = 6;

const TEMPLATE_CATEGORIES = (() => {
  const counts = new Map<string, number>();
  for (const t of TEMPLATES) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, CHIP_LIMIT)
    .map(([name]) => name);
  return ["All", ...top];
})();

function TemplatesPanel() {
  const loadTemplate = useEditorStore((s) => s.loadTemplate);
  const isPro = useEntitlementStore((s) => s.pro);
  const openLicense = useEntitlementStore((s) => s.openModal);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter(
      (t) =>
        (category === "All" || t.category === category) &&
        (q === "" ||
          t.name.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q))
    );
  }, [query, category]);

  return (
    <div className="space-y-3">
      <PanelTitle>Templates</PanelTitle>

      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder={`Search ${TEMPLATES.length} templates`}
      />

      <div className="flex flex-wrap gap-1.5">
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cx(
              "text-[11.5px] px-2.5 py-1 rounded-full transition-colors duration-150 ease-standard",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              category === c
                ? "bg-text-primary text-surface-2 font-medium"
                : "bg-surface-4 text-text-secondary hover:text-text-primary"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="text-[11.5px] text-text-ghost py-6 text-center">
          No templates match “{query}”.
        </p>
      )}

      <div className="grid grid-cols-2 gap-[10px]">
        {visible.map((t) => {
          const ratio = t.format.width / t.format.height;
          const aspectClass =
            ratio === 1 ? "aspect-square" : ratio < 0.6 ? "aspect-[9/16]" : "aspect-[2/3]";
          const isPortrait = ratio < 1;
          const locked = t.premium && !isPro;
          return (
            <button
              key={t.name}
              onClick={() =>
                locked
                  ? openLicense(`"${t.name}" is a premium template. Upgrade to unlock it and all others.`)
                  : loadTemplate(t)
              }
              aria-label={locked ? `${t.name} (premium template — upgrade to unlock)` : `Apply template ${t.name}`}
              className={`group rounded-[9px] overflow-hidden border border-border-subtle hover:border-accent transition-colors duration-150 ease-standard relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${aspectClass}`}
              style={{ backgroundColor: t.previewColor }}
            >
              <TemplatePreview
                bgColor={t.previewColor}
                accent={t.previewAccent}
                isStory={isPortrait}
              />
              {locked && (
                <div className="absolute top-1.5 right-1.5 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-black/55 backdrop-blur-sm">
                  <LockIcon className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[11.5px] text-white font-medium block">
                  {t.name}
                  {t.premium && (
                    <span className="ml-1 text-[9px] text-accent uppercase">Pro</span>
                  )}
                </span>
                <span className="text-[10px] text-white/60">
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
  const storage = useEntitlementStore((s) => s.storage);
  const isPro = useEntitlementStore((s) => s.pro);
  const openLicense = useEntitlementStore((s) => s.openModal);
  const refreshEntitlement = useEntitlementStore((s) => s.refresh);
  const [dragging, setDragging] = useState(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again re-fires onChange.
    e.target.value = "";
    if (file) uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    // Measure natural dimensions locally, then upload the bytes to R2 via our
    // API (which enforces the storage quota) and place the returned URL.
    const dims = await imageDimensions(file).catch(() => null);

    const form = new FormData();
    form.append("file", file);
    if (dims) {
      form.append("width", String(dims.w));
      form.append("height", String(dims.h));
    }

    let res: Response;
    try {
      res = await fetch("/api/uploads", { method: "POST", body: form });
    } catch {
      toast.error("Upload failed — check your connection and try again.");
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "quota_exceeded") {
        toast.error("You're out of storage. Free up space or upgrade for more.");
      } else if (data.error === "file_too_large") {
        toast.error("That image is too large (max 15MB).");
      } else if (data.error === "unsupported_type") {
        toast.error("That file type isn't supported.");
      } else if (res.status === 401) {
        toast.error("Please sign in to upload images.");
      } else {
        toast.error("Upload failed. Please try again.");
      }
      return;
    }

    const { url, width, height } = (await res.json()) as {
      url: string;
      width: number | null;
      height: number | null;
    };

    const natW = width ?? dims?.w ?? format.width * 0.6;
    const natH = height ?? dims?.h ?? natW;
    const maxW = format.width * 0.6;
    const w = Math.min(natW, maxW);
    const h = w * (natH / natW);

    addElement({
      type: "image",
      src: url,
      x: (format.width - w) / 2,
      y: (format.height - h) / 2,
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
    });
    // The quota just moved — keep the meter honest.
    refreshEntitlement();
  };

  const usedPct = storage
    ? Math.min(100, Math.round((storage.used / storage.limit) * 100))
    : 0;

  return (
    <div className="space-y-3">
      <PanelTitle>Uploads</PanelTitle>

      {storage && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11.5px] text-text-secondary font-mono tabular-nums">
              {formatMB(storage.used)} of {formatMB(storage.limit)}
            </span>
            {!isPro && (
              <button
                onClick={() => openLicense("Need more room? Pro raises storage to 1 GB.")}
                className="text-[11.5px] font-medium text-accent hover:text-accent-hover transition-colors duration-150 ease-standard"
              >
                Upgrade
              </button>
            )}
          </div>
          <div className="h-1 w-full rounded-full bg-surface-4 overflow-hidden">
            <div
              className={cx(
                "h-full rounded-full transition-all",
                usedPct >= 80 ? "bg-danger" : "bg-accent"
              )}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      )}

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) uploadFile(file);
        }}
        className={cx(
          "w-full border border-dashed rounded-[10px] py-7 flex flex-col items-center gap-1.5 cursor-pointer transition-colors duration-150 ease-standard",
          dragging
            ? "border-accent bg-accent-tint text-accent-tint-fg"
            : "border-border-default text-text-tertiary hover:border-border-strong hover:text-text-secondary"
        )}
      >
        <UploadIcon className="w-4 h-4" />
        <span className="text-[11.5px]">Drop images here</span>
        <span className="text-[11px] text-text-ghost">PNG, JPG, WEBP · up to 15 MB</span>
        <input type="file" accept="image/*" className="hidden" onChange={onInputChange} />
      </label>
    </div>
  );
}

/** MB with no decimals — storage figures are approximate by nature. */
function formatMB(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
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
          <span className="text-lg font-bold text-text-primary font-display">
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
            aria-label={`Add ${shape.id}`}
            title={`Add ${shape.id}`}
            className="aspect-square bg-surface-2 border border-border-subtle rounded-lg flex items-center justify-center hover:border-accent/40 hover:bg-surface-3 transition-all group"
          >
            {shape.id === "triangle" ? (
              <div
                className="w-8 h-8 bg-text-tertiary group-hover:bg-accent transition-colors"
                style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
              />
            ) : shape.id === "line" ? (
              <div className="w-8 h-[3px] bg-text-tertiary group-hover:bg-accent transition-colors rounded-full" />
            ) : (
              <div
                className={`w-8 h-8 bg-text-tertiary group-hover:bg-accent transition-colors ${shape.preview}`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function AssetsPanel() {
  const addElement = useEditorStore((s) => s.addElement);
  const format = useEditorStore((s) => s.format);

  const addAsset = (src: string) => {
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

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
        Assets
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {ASSETS.map((asset) => (
          <button
            key={asset.id}
            onClick={() => addAsset(asset.src)}
            aria-label="Add asset"
            title="Add to canvas"
            className="aspect-square bg-surface-2 border border-border-subtle rounded-lg overflow-hidden flex items-center justify-center hover:border-accent/40 hover:bg-surface-3 transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.src}
              alt=""
              className="w-full h-full object-contain p-1"
              loading="lazy"
            />
          </button>
        ))}
      </div>
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
      <p className="text-[11.5px] text-text-ghost leading-relaxed">
        Click any preset to add a full-canvas overlay layer. Adjust opacity and color in the right panel.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {OVERLAY_PRESETS.map((overlay) => (
          <button
            key={overlay.label}
            onClick={() => addElement(overlay.build({ width: format.width, height: format.height }))}
            className="aspect-video rounded-lg border border-border-subtle hover:border-accent/40 transition-all flex items-end p-2 overflow-hidden relative group"
            style={{ background: overlay.preview }}
          >
            <span className="text-[11.5px] text-white font-medium relative z-10 drop-shadow">
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
  assets: AssetsPanel,
  overlays: OverlaysPanel,
};

export default function LeftPanel({
  activePanel,
  onClose,
}: {
  activePanel: PanelType | null;
  onClose: () => void;
}) {
  if (!activePanel) return null;

  const PanelContent = PANELS[activePanel];

  return (
    <>
      {/* Below xl the panel floats over the canvas, so it needs a way out. */}
      <div
        className="absolute inset-0 z-20 xl:hidden"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cx(
          "w-[252px] bg-surface-1 border-r border-border-subtle p-[14px] overflow-y-auto shrink-0 animate-fade-in",
          // Docked at xl and up; an overlay below it. `left-[56px]` clears the
          // rail — at left-0 the overlay would slide under it. Docked panels get
          // a border and no shadow; only the floating form is raised.
          "absolute inset-y-0 left-[56px] z-30 shadow-pop xl:static xl:left-auto xl:z-auto xl:shadow-none"
        )}
      >
        <PanelContent />
      </div>
    </>
  );
}

/** Panel heading — ui-lg, not the uppercase micro used for section legends. */
function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12.5px] font-semibold text-text-primary">{children}</h3>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-ghost pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full bg-surface-2 border border-border-default rounded-md pl-8 pr-2.5 py-[7px] text-[11.5px] text-text-primary placeholder:text-text-ghost outline-none focus:border-accent transition-colors duration-150 ease-standard"
      />
    </div>
  );
}
