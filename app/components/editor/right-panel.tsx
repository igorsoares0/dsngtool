"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEditorStore } from "../../store/editor-store";
import { toastDeleted } from "../../store/toast-store";
import { ChevronDownIcon, LayersIcon, LockIcon, EyeIcon, TrashIcon, CursorIcon } from "./icons";
import { AVAILABLE_FONTS, resolveFontFamily } from "../../lib/fonts";
import ColorPicker from "./color-picker";
import { cx } from "../ui/cx";
import type { EditorElement, TextElement, ShapeElement, ImageElement } from "../../types/editor";

type Section = "position" | "typography" | "textShadow" | "image" | "imageFilters" | "fill" | "stroke" | "effects" | "layers";

function SectionHeader({
  label,
  isOpen,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={isOpen}
      className="w-full flex items-center justify-between py-2 group"
    >
      <span className="text-[10px] font-medium text-text-ghost uppercase tracking-[0.1em] group-hover:text-text-secondary transition-colors">
        {label}
      </span>
      <ChevronDownIcon
        className={`w-3 h-3 text-text-ghost transition-transform duration-200 ${
          isOpen ? "" : "-rotate-90"
        }`}
      />
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  const scrub = useRef<{ startX: number; startVal: number; moved: boolean } | null>(null);

  const clamp = (v: number) => {
    let r = v;
    if (min !== undefined) r = Math.max(min, r);
    if (max !== undefined) r = Math.min(max, r);
    return r;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrub.current = { startX: e.clientX, startVal: value, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const s = scrub.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 2) s.moved = true;
    // 1px ≈ one step; Shift = ×10 (coarse), Alt = ×0.1 (fine).
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    const steps = Math.round(dx * mult);
    const next = clamp(Number((s.startVal + steps * step).toFixed(4)));
    if (next !== value) onChange(next);
  };

  const endScrub = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!scrub.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    scrub.current = null;
  };

  // The label rides inside the field as a scrub handle, so a 2×2 grid of
  // X/Y/W/H reads as four controls rather than eight rows.
  return (
    <div className="flex items-center gap-1.5 bg-surface-3 border border-border-subtle rounded-md px-[9px] py-[6px] transition-colors focus-within:border-accent focus-within:bg-surface-2">
      <span
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
        title="Drag to adjust"
        className="text-[10px] font-mono text-text-ghost uppercase cursor-ew-resize select-none shrink-0 hover:text-text-secondary transition-colors"
      >
        {label}
      </span>
      <input
        type="number"
        aria-label={label}
        value={Math.round(value * 100) / 100}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full min-w-0 bg-transparent text-[11.5px] font-mono tabular-nums text-text-primary outline-none"
      />
    </div>
  );
}

function PositionSection({ el, update }: { el: EditorElement; update: (u: Partial<EditorElement>) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X" value={el.x} onChange={(v) => update({ x: v })} />
        <NumberField label="Y" value={el.y} onChange={(v) => update({ y: v })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="W" value={el.width} onChange={(v) => update({ width: v })} min={1} />
        <NumberField label="H" value={el.height} onChange={(v) => update({ height: v })} min={1} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Rotation" value={el.rotation} onChange={(v) => update({ rotation: v })} />
        <NumberField label="Opacity" value={Math.round(el.opacity * 100)} onChange={(v) => update({ opacity: v / 100 })} min={0} max={100} />
      </div>
    </div>
  );
}

function parseKonvaFontStyle(fontStyle: string | undefined) {
  const s = fontStyle || "normal";
  return {
    isBold: s.includes("bold"),
    isItalic: s.includes("italic"),
  };
}

function buildKonvaFontStyle(bold: boolean, italic: boolean): string {
  if (bold && italic) return "bold italic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

function StyleToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex-1 py-1 text-[11.5px] rounded-sm transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
        active
          ? "bg-surface-2 text-text-primary font-medium shadow-raise"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
    </button>
  );
}

function TypographySection({ el, update }: { el: TextElement; update: (u: Partial<EditorElement>) => void }) {
  const { isBold, isItalic } = parseKonvaFontStyle(el.fontStyle);
  const isUnderline = el.textDecoration === "underline";
  const isUppercase = el.textTransform === "uppercase";

  return (
    <div className="space-y-3">
      <div>
        <span className="text-[10px] font-medium text-text-ghost uppercase tracking-[0.1em]">Text</span>
        <textarea
          value={el.text}
          aria-label="Text content"
          onChange={(e) => update({ text: e.target.value })}
          rows={2}
          className="w-full mt-1 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent transition-colors resize-none"
        />
      </div>
      <div>
        <span className="text-[10px] font-medium text-text-ghost uppercase tracking-[0.1em]">Font</span>
        <select
          value={el.fontFamily}
          aria-label="Font family"
          onChange={(e) => update({ fontFamily: e.target.value })}
          // Both the trigger and the options render in the face they name.
          style={{ fontFamily: resolveFontFamily(el.fontFamily) }}
          className="w-full mt-1 bg-surface-3 border border-border-subtle text-[13px] text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent transition-colors"
        >
          {AVAILABLE_FONTS.map((f) => (
            <option key={f.family} value={f.family} style={{ fontFamily: resolveFontFamily(f.family) }}>
              {f.family}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Size" value={el.fontSize} onChange={(v) => update({ fontSize: v })} min={8} />
        <NumberField label="Line H." value={el.lineHeight || 1.2} onChange={(v) => update({ lineHeight: v })} step={0.1} min={0.5} max={4} />
      </div>
      <div>
        <span className="text-[10px] font-medium text-text-ghost uppercase tracking-[0.1em]">Style</span>
        <div className="flex mt-1 bg-surface-4 rounded-md p-[3px] gap-[2px]">
          <StyleToggle
            active={isBold}
            label="Bold"
            onClick={() => update({ fontStyle: buildKonvaFontStyle(!isBold, isItalic) } as Partial<EditorElement>)}
          >
            <span className="font-bold">B</span>
          </StyleToggle>
          <StyleToggle
            active={isItalic}
            label="Italic"
            onClick={() => update({ fontStyle: buildKonvaFontStyle(isBold, !isItalic) } as Partial<EditorElement>)}
          >
            <span className="italic">I</span>
          </StyleToggle>
          <StyleToggle
            active={isUnderline}
            label="Underline"
            onClick={() => update({ textDecoration: isUnderline ? "" : "underline" } as Partial<EditorElement>)}
          >
            <span className="underline">U</span>
          </StyleToggle>
          <StyleToggle
            active={isUppercase}
            label="Uppercase"
            onClick={() => update({ textTransform: isUppercase ? "none" : "uppercase" } as Partial<EditorElement>)}
          >
            <span className="text-[11.5px]">Aa</span>
          </StyleToggle>
        </div>
      </div>
      <div>
        <span className="text-[10px] font-medium text-text-ghost uppercase tracking-[0.1em]">Align</span>
        <div className="flex mt-1 bg-surface-4 rounded-md p-[3px] gap-[2px]">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => update({ align: a })}
              aria-label={`Align ${a}`}
              aria-pressed={el.align === a}
              className={`flex-1 py-1.5 text-[11.5px] rounded capitalize transition-all ${
                el.align === a
                  ? "bg-surface-4 text-text-primary"
                  : "text-text-ghost hover:text-text-tertiary"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FillSection({ el, update }: { el: EditorElement; update: (u: Partial<EditorElement>) => void }) {
  const fill = el.type === "text" ? (el as TextElement).fill : el.type === "shape" ? (el as ShapeElement).fill : null;
  if (fill === null) return null;

  const SWATCHES = [
    "#000000", "#FFFFFF", "#EF4444", "#F97316", "#EAB308",
    "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ColorPicker
          value={fill}
          onChange={(hex) => update({ fill: hex } as Partial<EditorElement>)}
        />
        <input
          type="text"
          value={fill}
          aria-label="Fill color hex"
          onChange={(e) => update({ fill: e.target.value } as Partial<EditorElement>)}
          className="flex-1 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent transition-colors font-mono uppercase"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => update({ fill: c } as Partial<EditorElement>)}
            aria-label={`Fill ${c}`}
            aria-pressed={fill === c}
            className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
              fill === c ? "border-accent scale-110" : "border-border-subtle"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

function FlipIcon({ direction }: { direction: "h" | "v" }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {direction === "h" ? (
        <>
          <path d="M12 3v18" />
          <path d="M16 7l4 5-4 5" />
          <path d="M8 7L4 12l4 5" />
        </>
      ) : (
        <>
          <path d="M3 12h18" />
          <path d="M7 8L12 4l5 4" />
          <path d="M7 16l5 4 5-4" />
        </>
      )}
    </svg>
  );
}

function ImageSection({ el, update }: { el: ImageElement; update: (u: Partial<EditorElement>) => void }) {
  return (
    <div className="space-y-3">
      {/* Flip */}
      <div>
        <span className="text-[11.5px] text-text-ghost uppercase block mb-1">Flip</span>
        <div className="flex gap-2">
          <button
            onClick={() => update({ flipX: !el.flipX } as Partial<EditorElement>)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] border transition-all ${
              el.flipX
                ? "bg-surface-4 text-text-primary border-border-default"
                : "bg-surface-2 text-text-ghost border-border-subtle hover:text-text-tertiary"
            }`}
          >
            <FlipIcon direction="h" />
            Horizontal
          </button>
          <button
            onClick={() => update({ flipY: !el.flipY } as Partial<EditorElement>)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] border transition-all ${
              el.flipY
                ? "bg-surface-4 text-text-primary border-border-default"
                : "bg-surface-2 text-text-ghost border-border-subtle hover:text-text-tertiary"
            }`}
          >
            <FlipIcon direction="v" />
            Vertical
          </button>
        </div>
      </div>

      {/* Border radius */}
      <NumberField
        label="Border Radius"
        value={el.cornerRadius || 0}
        onChange={(v) => update({ cornerRadius: v } as Partial<EditorElement>)}
        min={0}
        max={Math.min(el.width, el.height) / 2}
      />

      {/* Shadow */}
      <div>
        <span className="text-[11.5px] text-text-ghost uppercase block mb-1">Shadow</span>
        <div className="space-y-2">
          <NumberField
            label="Blur"
            value={el.shadowBlur || 0}
            onChange={(v) => update({ shadowBlur: v } as Partial<EditorElement>)}
            min={0}
            max={100}
          />
          {(el.shadowBlur || 0) > 0 && (
            <div className="flex items-center gap-2">
              <ColorPicker
                value={el.shadowColor || "#000000"}
                onChange={(hex) => update({ shadowColor: hex } as Partial<EditorElement>)}
              />
              <input
                type="text"
                value={el.shadowColor || "#000000"}
                aria-label="Shadow color hex"
                onChange={(e) => update({ shadowColor: e.target.value } as Partial<EditorElement>)}
                className="flex-1 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent transition-colors font-mono uppercase"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImageFiltersSection({ el, update }: { el: ImageElement; update: (u: Partial<EditorElement>) => void }) {
  const FILTER_PRESETS: { label: string; values: Partial<ImageElement> }[] = [
    { label: "None", values: { filterBlur: 0, filterBrightness: 0, filterContrast: 0, filterSaturation: 0, filterGrayscale: false, filterSepia: false, filterInvert: false } },
    { label: "B&W", values: { filterGrayscale: true, filterSepia: false, filterContrast: 10 } },
    { label: "Sepia", values: { filterSepia: true, filterGrayscale: false, filterSaturation: 0 } },
    { label: "Pop", values: { filterContrast: 20, filterSaturation: 1.5, filterBrightness: 0.05 } },
    { label: "Faded", values: { filterContrast: -15, filterSaturation: -0.8, filterBrightness: 0.1 } },
    { label: "Dramatic", values: { filterContrast: 30, filterBrightness: -0.1, filterSaturation: 0.3 } },
  ];

  return (
    <div className="space-y-3">
      <div>
        <span className="text-[11.5px] text-text-ghost uppercase block mb-1">Presets</span>
        <div className="grid grid-cols-3 gap-1">
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => update(p.values as Partial<EditorElement>)}
              className="py-1.5 text-[11.5px] rounded bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Blur"
          value={el.filterBlur || 0}
          onChange={(v) => update({ filterBlur: v } as Partial<EditorElement>)}
          min={0}
          max={40}
        />
        <NumberField
          label="Brightness"
          value={Math.round((el.filterBrightness || 0) * 100)}
          onChange={(v) => update({ filterBrightness: v / 100 } as Partial<EditorElement>)}
          min={-100}
          max={100}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Contrast"
          value={el.filterContrast || 0}
          onChange={(v) => update({ filterContrast: v } as Partial<EditorElement>)}
          min={-100}
          max={100}
        />
        <NumberField
          label="Saturation"
          value={Math.round((el.filterSaturation || 0) * 10)}
          onChange={(v) => update({ filterSaturation: v / 10 } as Partial<EditorElement>)}
          min={-20}
          max={100}
        />
      </div>

      <div className="flex gap-1.5">
        {([
          { key: "filterGrayscale", label: "B&W" },
          { key: "filterSepia", label: "Sepia" },
          { key: "filterInvert", label: "Invert" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => update({ [t.key]: !el[t.key] } as Partial<EditorElement>)}
            className={`flex-1 py-1.5 text-[11.5px] rounded border transition-all ${
              el[t.key]
                ? "bg-accent-tint text-accent-tint-fg border-accent/40"
                : "bg-surface-2 text-text-ghost border-border-subtle hover:text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextShadowSection({ el, update }: { el: TextElement; update: (u: Partial<EditorElement>) => void }) {
  const blur = el.shadowBlur || 0;
  const offsetX = el.shadowOffsetX || 0;
  const offsetY = el.shadowOffsetY || 0;
  const opacity = el.shadowOpacity ?? 1;
  const color = el.shadowColor || "#000000";
  const isEnabled = blur > 0 || offsetX !== 0 || offsetY !== 0;

  const PRESETS = [
    { label: "None", values: { shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 } },
    { label: "Soft", values: { shadowBlur: 12, shadowOffsetX: 0, shadowOffsetY: 4, shadowOpacity: 0.4, shadowColor: "#000000" } },
    { label: "Hard", values: { shadowBlur: 0, shadowOffsetX: 6, shadowOffsetY: 6, shadowOpacity: 1, shadowColor: "#000000" } },
    { label: "Glow", values: { shadowBlur: 20, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0.8, shadowColor: "#FFFFFF" } },
  ];

  return (
    <div className="space-y-3">
      <div>
        <span className="text-[11.5px] text-text-ghost uppercase block mb-1">Presets</span>
        <div className="grid grid-cols-4 gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => update(p.values as Partial<EditorElement>)}
              className="py-1.5 text-[11.5px] rounded bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-secondary hover:text-text-primary transition-all"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Blur"
          value={blur}
          onChange={(v) => update({ shadowBlur: v } as Partial<EditorElement>)}
          min={0}
          max={100}
        />
        <NumberField
          label="Opacity"
          value={Math.round(opacity * 100)}
          onChange={(v) => update({ shadowOpacity: Math.max(0, Math.min(1, v / 100)) } as Partial<EditorElement>)}
          min={0}
          max={100}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          label="Offset X"
          value={offsetX}
          onChange={(v) => update({ shadowOffsetX: v } as Partial<EditorElement>)}
          min={-100}
          max={100}
        />
        <NumberField
          label="Offset Y"
          value={offsetY}
          onChange={(v) => update({ shadowOffsetY: v } as Partial<EditorElement>)}
          min={-100}
          max={100}
        />
      </div>
      {isEnabled && (
        <div>
          <span className="text-[11.5px] text-text-ghost uppercase block mb-1">Color</span>
          <div className="flex items-center gap-2">
            <ColorPicker
              value={color}
              onChange={(hex) => update({ shadowColor: hex } as Partial<EditorElement>)}
            />
            <input
              type="text"
              value={color}
              aria-label="Shadow color hex"
              onChange={(e) => update({ shadowColor: e.target.value } as Partial<EditorElement>)}
              className="flex-1 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent transition-colors font-mono uppercase"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StrokeSection({ el, update }: { el: ShapeElement; update: (u: Partial<EditorElement>) => void }) {
  const stroke = el.stroke || "#000000";
  const strokeWidth = el.strokeWidth || 0;

  const STROKE_SWATCHES = [
    "#000000", "#FFFFFF", "#EF4444", "#F97316", "#EAB308",
    "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <NumberField
          label="Width"
          value={strokeWidth}
          onChange={(v) => update({ strokeWidth: v, stroke: v > 0 && !el.stroke ? "#000000" : el.stroke } as Partial<EditorElement>)}
          min={0}
          max={50}
        />
      </div>
      {strokeWidth > 0 && (
        <>
          <div className="flex items-center gap-2">
            <ColorPicker
              value={stroke}
              onChange={(hex) => update({ stroke: hex } as Partial<EditorElement>)}
            />
            <input
              type="text"
              value={stroke}
              aria-label="Stroke color hex"
              onChange={(e) => update({ stroke: e.target.value } as Partial<EditorElement>)}
              className="flex-1 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent transition-colors font-mono uppercase"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STROKE_SWATCHES.map((c) => (
              <button
                key={c}
                onClick={() => update({ stroke: c } as Partial<EditorElement>)}
                aria-label={`Stroke ${c}`}
                aria-pressed={stroke.toLowerCase() === c.toLowerCase()}
                className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                  stroke.toLowerCase() === c.toLowerCase() ? "border-accent scale-110" : "border-border-subtle"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DragHandleIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="shrink-0 opacity-40">
      <circle cx="3" cy="2" r="1" />
      <circle cx="7" cy="2" r="1" />
      <circle cx="3" cy="5" r="1" />
      <circle cx="7" cy="5" r="1" />
      <circle cx="3" cy="8" r="1" />
      <circle cx="7" cy="8" r="1" />
    </svg>
  );
}

function SortableLayerItem({ el, isSelected }: { el: EditorElement; isSelected: boolean }) {
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const removeElement = useEditorStore((s) => s.removeElement);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: el.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const handleClick = (e: React.MouseEvent) => {
    selectElement(el.id, e.shiftKey);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors group cursor-pointer ${
        isSelected
          ? "bg-surface-3 border border-border-default"
          : "hover:bg-surface-2 border border-transparent"
      }`}
    >
      <div {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab active:cursor-grabbing p-0.5">
        <DragHandleIcon />
      </div>
      <div className="w-5 h-5 rounded bg-surface-3 flex items-center justify-center shrink-0">
        <span className="text-[10px] text-text-ghost uppercase">
          {el.type[0]}
        </span>
      </div>
      <span className="text-xs text-text-secondary flex-1 truncate">
        {el.type === "text" ? (el as TextElement).text.slice(0, 20) : `${el.type} ${el.id.slice(-4)}`}
      </span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); updateElement(el.id, { hidden: !el.hidden }); }}
          aria-label={el.hidden ? "Show layer" : "Hide layer"}
          aria-pressed={el.hidden}
          title={el.hidden ? "Show" : "Hide"}
          className={`p-0.5 ${el.hidden ? "text-text-primary" : "text-text-ghost hover:text-text-tertiary"}`}
        >
          <EyeIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }}
          aria-label={el.locked ? "Unlock layer" : "Lock layer"}
          aria-pressed={el.locked}
          title={el.locked ? "Unlock" : "Lock"}
          className={`p-0.5 ${el.locked ? "text-text-primary" : "text-text-ghost hover:text-text-tertiary"}`}
        >
          <LockIcon />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); removeElement(el.id); toastDeleted(1); }}
          aria-label="Delete layer"
          title="Delete"
          className="p-0.5 text-text-ghost hover:text-danger"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

function LayersSection() {
  const elements = useEditorStore((s) => s.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const reorderElements = useEditorStore((s) => s.reorderElements);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const reversed = [...elements].reverse();
  const reversedIds = reversed.map((el) => el.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldVisualIndex = reversedIds.indexOf(active.id as string);
    const newVisualIndex = reversedIds.indexOf(over.id as string);

    const fromIndex = elements.length - 1 - oldVisualIndex;
    const toIndex = elements.length - 1 - newVisualIndex;

    reorderElements(fromIndex, toIndex);
  };

  return (
    <div className="space-y-1">
      {elements.length === 0 ? (
        <p className="text-[11.5px] text-text-ghost text-center py-4">No elements</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={reversedIds} strategy={verticalListSortingStrategy}>
            {reversed.map((el) => (
              <SortableLayerItem key={el.id} el={el} isSelected={selectedIds.includes(el.id)} />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

const LINEAR_DIRECTIONS: {
  label: string;
  startX: number; startY: number; endX: number; endY: number;
}[] = [
  { label: "↓", startX: 0, startY: 0, endX: 0, endY: 1 },
  { label: "→", startX: 0, startY: 0, endX: 1, endY: 0 },
  { label: "↘", startX: 0, startY: 0, endX: 1, endY: 1 },
  { label: "↙", startX: 1, startY: 0, endX: 0, endY: 1 },
  { label: "↑", startX: 0, startY: 1, endX: 0, endY: 0 },
  { label: "←", startX: 1, startY: 0, endX: 0, endY: 0 },
];

const GRADIENT_PRESETS: { name: string; colors: [string, string] }[] = [
  { name: "Sunset", colors: ["#FF7E5F", "#FEB47B"] },
  { name: "Ocean", colors: ["#2E3192", "#1BFFFF"] },
  { name: "Peach", colors: ["#FFD89B", "#FFB199"] },
  { name: "Mint", colors: ["#A8EDEA", "#FED6E3"] },
  { name: "Lavender", colors: ["#B721FF", "#21D4FD"] },
  { name: "Forest", colors: ["#134E5E", "#71B280"] },
  { name: "Berry", colors: ["#8E2DE2", "#4A00E0"] },
  { name: "Sand", colors: ["#F5F0E8", "#D5C7B5"] },
  { name: "Mono", colors: ["#1A1A1A", "#4A4A4A"] },
  { name: "Coral", colors: ["#FF512F", "#F09819"] },
];

function BackgroundSection() {
  const backgroundColor = useEditorStore((s) => s.backgroundColor);
  const backgroundGradient = useEditorStore((s) => s.backgroundGradient);
  const setBackgroundColor = useEditorStore((s) => s.setBackgroundColor);
  const setBackgroundGradient = useEditorStore((s) => s.setBackgroundGradient);

  const BG_SWATCHES = [
    "#FFFFFF", "#F5F5F4", "#FEF3C7", "#F5F0E8", "#E8E0D4",
    "#D5C7B5", "#C4B5A2", "#A8927D", "#4A5043", "#2D3A2D",
    "#1A2E1A", "#0F172A", "#1E293B", "#0C0C0C", "#000000",
  ];

  const mode: "solid" | "linear" | "radial" = backgroundGradient
    ? backgroundGradient.type
    : "solid";

  const startColor =
    backgroundGradient && typeof backgroundGradient.colorStops[1] === "string"
      ? (backgroundGradient.colorStops[1] as string)
      : "#FF7E5F";
  const endColor =
    backgroundGradient && typeof backgroundGradient.colorStops[3] === "string"
      ? (backgroundGradient.colorStops[3] as string)
      : "#FEB47B";

  const applyMode = (next: "solid" | "linear" | "radial") => {
    if (next === "solid") {
      setBackgroundGradient(null);
      return;
    }
    if (next === "linear") {
      setBackgroundGradient({
        type: "linear",
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 1,
        colorStops: [0, startColor, 1, endColor],
      });
      return;
    }
    setBackgroundGradient({
      type: "radial",
      startX: 0.5,
      startY: 0.5,
      endX: 0.5,
      endY: 0.5,
      startRadius: 0,
      endRadius: 0.7,
      colorStops: [0, startColor, 1, endColor],
    });
  };

  const updateColors = (s: string, e: string) => {
    if (!backgroundGradient) return;
    setBackgroundGradient({
      ...backgroundGradient,
      colorStops: [0, s, 1, e],
    });
  };

  const setLinearDirection = (d: (typeof LINEAR_DIRECTIONS)[number]) => {
    if (!backgroundGradient || backgroundGradient.type !== "linear") return;
    setBackgroundGradient({
      ...backgroundGradient,
      startX: d.startX,
      startY: d.startY,
      endX: d.endX,
      endY: d.endY,
    });
  };

  const activeDirection = LINEAR_DIRECTIONS.findIndex(
    (d) =>
      backgroundGradient?.type === "linear" &&
      d.startX === backgroundGradient.startX &&
      d.startY === backgroundGradient.startY &&
      d.endX === backgroundGradient.endX &&
      d.endY === backgroundGradient.endY
  );

  const previewStyle = (colors: [string, string]) => ({
    background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
  });

  return (
    <div className="border-b border-border-subtle pb-3 mb-1">
      <span className="text-[11.5px] font-semibold text-text-secondary uppercase tracking-wider block py-2">
        Background
      </span>
      <div className="space-y-3">
        <div className="flex bg-surface-2 rounded-md p-0.5 border border-border-subtle">
          {(["solid", "linear", "radial"] as const).map((m) => (
            <button
              key={m}
              onClick={() => applyMode(m)}
              className={`flex-1 py-1 text-[11.5px] rounded capitalize transition-all ${
                mode === m
                  ? "bg-surface-4 text-text-primary"
                  : "text-text-ghost hover:text-text-tertiary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "solid" && (
          <>
            <div className="flex items-center gap-2">
              <ColorPicker
                value={backgroundColor}
                onChange={(hex) => setBackgroundColor(hex)}
              />
              <input
                type="text"
                value={backgroundColor}
                aria-label="Background color hex"
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent transition-colors font-mono uppercase"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {BG_SWATCHES.map((c) => (
                <button
                  key={c}
                  onClick={() => setBackgroundColor(c)}
                  aria-label={`Background ${c}`}
                  aria-pressed={backgroundColor.toLowerCase() === c.toLowerCase()}
                  className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                    backgroundColor.toLowerCase() === c.toLowerCase()
                      ? "border-accent scale-110"
                      : "border-border-subtle"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </>
        )}

        {(mode === "linear" || mode === "radial") && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[11.5px] text-text-ghost uppercase block">Start</span>
                <div className="flex items-center gap-1.5">
                  <ColorPicker
                    value={startColor}
                    size="sm"
                    onChange={(hex) => updateColors(hex, endColor)}
                  />
                  <input
                    type="text"
                    value={startColor}
                    aria-label="Gradient start color"
                    onChange={(e) => updateColors(e.target.value, endColor)}
                    className="flex-1 min-w-0 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-1.5 py-1 rounded-sm outline-none focus:border-accent transition-colors font-mono uppercase"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[11.5px] text-text-ghost uppercase block">End</span>
                <div className="flex items-center gap-1.5">
                  <ColorPicker
                    value={endColor}
                    size="sm"
                    onChange={(hex) => updateColors(startColor, hex)}
                  />
                  <input
                    type="text"
                    value={endColor}
                    aria-label="Gradient end color"
                    onChange={(e) => updateColors(startColor, e.target.value)}
                    className="flex-1 min-w-0 bg-surface-3 border border-border-subtle text-[11.5px] text-text-primary px-1.5 py-1 rounded-sm outline-none focus:border-accent transition-colors font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {mode === "linear" && (
              <div className="space-y-1">
                <span className="text-[11.5px] text-text-ghost uppercase block">Direction</span>
                <div className="grid grid-cols-6 gap-1">
                  {LINEAR_DIRECTIONS.map((d, i) => {
                    const DIR_NAMES: Record<string, string> = {
                      "↓": "down", "→": "right", "↘": "down-right",
                      "↙": "down-left", "↑": "up", "←": "left",
                    };
                    return (
                      <button
                        key={d.label}
                        onClick={() => setLinearDirection(d)}
                        aria-label={`Gradient direction ${DIR_NAMES[d.label] ?? ""}`}
                        aria-pressed={activeDirection === i}
                        className={`h-7 rounded text-sm border transition-all ${
                          activeDirection === i
                            ? "border-accent bg-surface-3 text-text-primary"
                            : "border-border-subtle text-text-tertiary hover:text-text-primary hover:bg-surface-2"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <span className="text-[11.5px] text-text-ghost uppercase block">Presets</span>
              <div className="grid grid-cols-5 gap-1.5">
                {GRADIENT_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => updateColors(p.colors[0], p.colors[1])}
                    title={p.name}
                    className="aspect-square rounded-md border border-border-subtle hover:border-accent/60 hover:scale-105 transition-all"
                    style={previewStyle(p.colors)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MultiSelectionInfo() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const removeSelectedElements = useEditorStore((s) => s.removeSelectedElements);
  const duplicateSelectedElements = useEditorStore((s) => s.duplicateSelectedElements);
  const updateMultipleElements = useEditorStore((s) => s.updateMultipleElements);
  const elements = useEditorStore((s) => s.elements);

  const selectedEls = elements.filter((el) => selectedIds.includes(el.id));

  return (
    <div className="border-b border-border-subtle pb-3 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded bg-surface-3 flex items-center justify-center">
          <LayersIcon className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-xs text-text-primary font-medium">
          {selectedIds.length} elements selected
        </span>
      </div>
      <div className="space-y-2">
        <div>
          <span className="text-[11.5px] text-text-ghost uppercase block mb-1">Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((selectedEls[0]?.opacity ?? 1) * 100)}
            onChange={(e) => {
              const val = Number(e.target.value) / 100;
              const updates = new Map<string, { opacity: number }>();
              for (const id of selectedIds) updates.set(id, { opacity: val });
              updateMultipleElements(updates);
            }}
            className="w-full accent-accent h-1"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={duplicateSelectedElements}
            className="flex-1 py-1.5 text-[11.5px] text-text-secondary bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-md transition-all"
          >
            Duplicate All
          </button>
          <button
            onClick={() => {
              const count = selectedIds.length;
              removeSelectedElements();
              toastDeleted(count);
            }}
            className="flex-1 py-1.5 text-[11.5px] text-danger bg-surface-2 hover:bg-surface-3 border border-border-subtle rounded-md transition-all"
          >
            Delete All
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-border-default rounded-lg px-3 py-5 flex flex-col items-center text-center gap-2.5 mb-2 animate-fade-in">
      <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center">
        <CursorIcon className="w-4 h-4 text-text-tertiary" />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-text-secondary font-medium">Nothing selected</p>
        <p className="text-[11.5px] text-text-ghost leading-relaxed">
          Click an element on the canvas to edit it. Adjust the document background and layers below.
        </p>
      </div>
    </div>
  );
}

export default function RightPanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.elements);
  const updateElement = useEditorStore((s) => s.updateElement);

  const isSingle = selectedIds.length === 1;
  const selected = isSingle ? elements.find((e) => e.id === selectedIds[0]) : null;

  // Local state: nothing outside this panel reads the active tab.
  const [tab, setTab] = useState<"properties" | "layers">("properties");

  const [openSections, setOpenSections] = useState<Set<Section>>(
    new Set(["position", "fill", "layers"])
  );

  const toggleSection = (section: Section) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const update = (updates: Partial<EditorElement>) => {
    if (selected) updateElement(selected.id, updates);
  };

  return (
    <aside
      className={cx(
        "bg-surface-1 border-border-subtle overflow-y-auto shrink-0",
        // Docked from lg up; a bottom sheet below it.
        "fixed inset-x-0 bottom-0 z-30 h-[45vh] rounded-t-xl border-t shadow-modal",
        "lg:static lg:h-auto lg:w-[266px] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-none lg:z-auto"
      )}
    >
      {/* Tabs. Layers used to be one collapsible section among many; at this
          width it deserves the full panel. */}
      <div className="flex items-end gap-1 px-2 pt-2 border-b border-border-subtle sticky top-0 bg-surface-1 z-10">
        {(["properties", "layers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={cx(
              "flex-1 text-[11.5px] py-2 rounded-t-md transition-colors duration-150 ease-standard capitalize",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              tab === t
                ? "bg-surface-2 text-text-primary font-medium"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "layers" ? (
        <div className="p-[14px] animate-fade-in">
          <LayersSection />
        </div>
      ) : (
      <div className="p-[14px] space-y-1 animate-fade-in">
        {/* Empty state — nothing selected; document-level controls remain below */}
        {selectedIds.length === 0 && <EmptyState />}

        {/* Multi-selection info */}
        {selectedIds.length > 1 && <MultiSelectionInfo />}

        {/* Position & Size — only when single element selected */}
        {selected && (
          <div className="border-b border-border-subtle pb-2">
            <SectionHeader
              label="Position & Size"
              isOpen={openSections.has("position")}
              onToggle={() => toggleSection("position")}
            />
            {openSections.has("position") && (
              <div className="pb-2 animate-fade-in">
                <PositionSection el={selected} update={update} />
              </div>
            )}
          </div>
        )}

        {/* Typography — only for text */}
        {selected?.type === "text" && (
          <div className="border-b border-border-subtle pb-2">
            <SectionHeader
              label="Typography"
              isOpen={openSections.has("typography")}
              onToggle={() => toggleSection("typography")}
            />
            {openSections.has("typography") && (
              <div className="pb-2 animate-fade-in">
                <TypographySection el={selected as TextElement} update={update} />
              </div>
            )}
          </div>
        )}

        {/* Text shadow — only for text */}
        {selected?.type === "text" && (
          <div className="border-b border-border-subtle pb-2">
            <SectionHeader
              label="Text Shadow"
              isOpen={openSections.has("textShadow")}
              onToggle={() => toggleSection("textShadow")}
            />
            {openSections.has("textShadow") && (
              <div className="pb-2 animate-fade-in">
                <TextShadowSection el={selected as TextElement} update={update} />
              </div>
            )}
          </div>
        )}

        {/* Image controls — only for images */}
        {selected?.type === "image" && (
          <div className="border-b border-border-subtle pb-2">
            <SectionHeader
              label="Image"
              isOpen={openSections.has("image")}
              onToggle={() => toggleSection("image")}
            />
            {openSections.has("image") && (
              <div className="pb-2 animate-fade-in">
                <ImageSection el={selected as ImageElement} update={update} />
              </div>
            )}
          </div>
        )}

        {/* Image filters — only for images */}
        {selected?.type === "image" && (
          <div className="border-b border-border-subtle pb-2">
            <SectionHeader
              label="Filters"
              isOpen={openSections.has("imageFilters")}
              onToggle={() => toggleSection("imageFilters")}
            />
            {openSections.has("imageFilters") && (
              <div className="pb-2 animate-fade-in">
                <ImageFiltersSection el={selected as ImageElement} update={update} />
              </div>
            )}
          </div>
        )}

        {/* Fill — for text + shapes (lines use stroke only) */}
        {selected &&
          (selected.type === "text" ||
            (selected.type === "shape" &&
              (selected as ShapeElement).shapeType !== "line")) && (
            <div className="border-b border-border-subtle pb-2">
              <SectionHeader
                label="Fill & Color"
                isOpen={openSections.has("fill")}
                onToggle={() => toggleSection("fill")}
              />
              {openSections.has("fill") && (
                <div className="pb-2 animate-fade-in">
                  <FillSection el={selected} update={update} />
                </div>
              )}
            </div>
          )}

        {/* Stroke — only for shapes */}
        {selected?.type === "shape" && (
          <div className="border-b border-border-subtle pb-2">
            <SectionHeader
              label="Stroke"
              isOpen={openSections.has("stroke")}
              onToggle={() => toggleSection("stroke")}
            />
            {openSections.has("stroke") && (
              <div className="pb-2 animate-fade-in">
                <StrokeSection el={selected as ShapeElement} update={update} />
              </div>
            )}
          </div>
        )}

        {/* Background color — always visible */}
        <BackgroundSection />
      </div>
      )}
    </aside>
  );
}
