"use client";

import { useMemo, useRef, useState } from "react";
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
import { LockIcon, EyeIcon, TrashIcon, TextIcon, ShapesIcon, ImageIcon, LayersIcon } from "./icons";
import { AVAILABLE_FONTS, FONT_CATEGORY_LABELS, resolveFontFamily } from "../../lib/fonts";
import { docPalette } from "../../lib/doc-palette";
import { elementLabel } from "../../lib/element-label";
import ColorPicker from "./color-picker";
import FontSelect from "./font-select";
import Segmented from "../ui/segmented";
import SectionLabel from "../ui/section-label";
import { cx } from "../ui/cx";
import type { EditorElement, TextElement, ShapeElement, ImageElement } from "../../types/editor";

type Update = (u: Partial<EditorElement>) => void;

/* ---------------------------------------------------------------------------
   Building blocks
--------------------------------------------------------------------------- */

/** One coded section, separated from the next by a hairline. */
function Section({
  code,
  label,
  right,
  children,
}: {
  code: string;
  label: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="px-4 py-3 border-b border-border-default flex flex-col gap-2.5">
      <SectionLabel code={code} right={right}>
        {label}
      </SectionLabel>
      {children}
    </section>
  );
}

/** Mono caption inside a section ("FROM THIS DESIGN", "START", …). */
function Caption({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[10.5px] uppercase text-text-tertiary">{children}</span>;
}

/**
 * 28px number field: a 26px mono label cell that scrubs on horizontal drag
 * (1px = one step; ⇧ ×10, ⌥ ×0.1), the value, and a unit. A typed value out
 * of range is held with a danger ring and a "MIN 1" hint instead of being
 * silently clamped; it reverts on blur.
 */
function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  title,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  /** Accessible name when `label` is an abbreviation. */
  title?: string;
}) {
  const scrub = useRef<{ startX: number; startVal: number } | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (v: number) => {
    let r = v;
    if (min !== undefined) r = Math.max(min, r);
    if (max !== undefined) r = Math.min(max, r);
    return r;
  };

  const parsed = draft === null ? null : Number(draft);
  const error =
    parsed === null || draft === "" || Number.isNaN(parsed)
      ? null
      : min !== undefined && parsed < min
        ? `MIN ${min}`
        : max !== undefined && parsed > max
          ? `MAX ${Math.round(max)}`
          : null;

  const onPointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    scrub.current = { startX: e.clientX, startVal: value };
    setScrubbing(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLSpanElement>) => {
    const s = scrub.current;
    if (!s) return;
    const dx = e.clientX - s.startX;
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    const steps = Math.round(dx * mult);
    const next = clamp(Number((s.startVal + steps * step).toFixed(4)));
    if (next !== value) onChange(next);
  };

  const endScrub = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (!scrub.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    scrub.current = null;
    setScrubbing(false);
  };

  const shown = draft ?? String(Math.round(value * 100) / 100);

  return (
    <div className="flex flex-col gap-[3px] min-w-0">
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={cx(
          "flex items-center h-7 overflow-hidden transition-shadow",
          error
            ? "bg-surface-3 shadow-[inset_0_0_0_1.5px_var(--danger)]"
            : scrubbing
              ? "bg-selection-tint shadow-[inset_0_0_0_1px_var(--selection)]"
              : "bg-surface-3 hover:shadow-[inset_0_0_0_1px_var(--text-tertiary)] focus-within:bg-surface-1 focus-within:shadow-[inset_0_0_0_1.5px_var(--selection)]"
        )}
      >
        <span
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          title="Drag to adjust"
          className={cx(
            "w-[26px] h-full shrink-0 flex items-center justify-center border-r border-border-default font-mono text-[10.5px] cursor-ew-resize select-none",
            error ? "text-danger" : scrubbing ? "text-selection" : hover ? "text-text-primary" : "text-text-tertiary"
          )}
        >
          {(hover || scrubbing) && !error ? "↔" : label}
        </span>
        <input
          type="text"
          inputMode="decimal"
          aria-label={title ?? label}
          aria-invalid={!!error || undefined}
          value={shown}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            const n = Number(raw);
            if (raw.trim() === "" || raw === "-" || Number.isNaN(n)) return;
            if ((min !== undefined && n < min) || (max !== undefined && n > max)) return;
            onChange(n);
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const mult = e.shiftKey ? 10 : 1;
              onChange(clamp(Number((value + (e.key === "ArrowUp" ? 1 : -1) * step * mult).toFixed(4))));
              setDraft(null);
            }
          }}
          className="flex-1 min-w-0 px-2 bg-transparent font-mono text-[11.5px] font-medium tabular-nums text-text-primary outline-none"
        />
        {unit && <span className="pr-2 font-mono text-[10.5px] text-text-tertiary shrink-0">{unit}</span>}
      </div>
      {error && <span className="font-mono text-[10px] text-danger">{error}</span>}
    </div>
  );
}

/** A row of round swatches: the document palette, then a dashed "+" picker. */
function SwatchRow({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const pages = useEditorStore((s) => s.pages);
  const palette = useMemo(() => docPalette(pages), [pages]);
  const current = value.toUpperCase();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        {palette.map((c) => {
          const on = c === current;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              aria-label={`Use ${c}`}
              aria-pressed={on}
              className={cx(
                "w-[30px] h-[30px] rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
                on
                  ? "shadow-[0_0_0_2px_var(--surface-1),0_0_0_3.5px_var(--selection)]"
                  : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] hover:shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12),0_0_0_1px_var(--text-primary)]"
              )}
              style={{ backgroundColor: c }}
            />
          );
        })}
        <ColorPicker value={value} onChange={onChange} variant="add" />
      </div>
      {palette.length > 0 && <Caption>From this design</Caption>}
    </div>
  );
}

function HexReadout({ value }: { value: string }) {
  return <span className="font-mono text-[11px] font-medium uppercase text-text-primary">{value}</span>;
}

/** Hairline-ruled square cells with an ink-filled active cell. */
function CellRow({ children, cols }: { children: React.ReactNode; cols: number }) {
  return (
    <div
      className="grid h-7 border border-border-default overflow-hidden divide-x divide-border-default text-[12px] text-text-secondary"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
}

function Cell({
  active,
  onClick,
  label,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cx(
        "flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
        active ? "bg-surface-inverse text-text-inverse" : "hover:bg-surface-3 hover:text-text-primary",
        className
      )}
    >
      {children}
    </button>
  );
}

function AlignIcon({ align }: { align: "left" | "center" | "right" }) {
  const lines =
    align === "left"
      ? ["M4 6h16", "M4 10h10", "M4 14h16", "M4 18h10"]
      : align === "center"
        ? ["M4 6h16", "M7 10h10", "M4 14h16", "M7 18h10"]
        : ["M4 6h16", "M10 10h10", "M4 14h16", "M10 18h10"];
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      {lines.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

function SmallButton({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "h-8 flex-1 border border-border-default text-[12.5px] font-semibold transition-colors",
        "hover:border-text-primary hover:bg-surface-3 active:bg-surface-inverse active:text-text-inverse",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
        danger ? "text-danger" : "text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------------------
   Sections
--------------------------------------------------------------------------- */

const TILE: Record<EditorElement["type"], { cls: string; Icon: typeof TextIcon }> = {
  text: { cls: "bg-tool-text text-tool-text-fg", Icon: TextIcon },
  shape: { cls: "bg-tool-shapes text-tool-shapes-fg", Icon: ShapesIcon },
  image: { cls: "bg-tool-uploads text-tool-uploads-fg", Icon: ImageIcon },
};

function SelectedHeader({ el }: { el: EditorElement }) {
  const { cls, Icon } = TILE[el.type];
  return (
    <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-border-default">
      <span className={cx("w-8 h-8 shrink-0 flex items-center justify-center", cls)}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[10.5px] text-text-tertiary">SELECTED · {el.type.toUpperCase()}</span>
        <span className="text-[17px] font-bold truncate text-text-primary" style={{ fontStretch: "110%" }}>
          {elementLabel(el, 22)}
        </span>
      </div>
    </div>
  );
}

function GeometrySection({ el, update }: { el: EditorElement; update: Update }) {
  return (
    <Section code="A" label="Geometry">
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField label="X" title="X position" unit="PX" value={el.x} onChange={(v) => update({ x: v })} />
        <NumberField label="Y" title="Y position" unit="PX" value={el.y} onChange={(v) => update({ y: v })} />
        <NumberField label="W" title="Width" unit="PX" value={el.width} onChange={(v) => update({ width: v })} min={1} />
        <NumberField label="H" title="Height" unit="PX" value={el.height} onChange={(v) => update({ height: v })} min={1} />
        <NumberField label="R" title="Rotation" unit="°" value={el.rotation} onChange={(v) => update({ rotation: v })} min={-360} max={360} />
        <NumberField
          label="O"
          title="Opacity"
          unit="%"
          value={Math.round(el.opacity * 100)}
          onChange={(v) => update({ opacity: v / 100 })}
          min={0}
          max={100}
        />
      </div>
    </Section>
  );
}

function parseKonvaFontStyle(fontStyle: string | undefined) {
  const s = fontStyle || "normal";
  return { isBold: s.includes("bold"), isItalic: s.includes("italic") };
}

function buildKonvaFontStyle(bold: boolean, italic: boolean): string {
  if (bold && italic) return "bold italic";
  if (bold) return "bold";
  if (italic) return "italic";
  return "normal";
}

const FONT_CATEGORY = new Map(AVAILABLE_FONTS.map((f) => [f.family, f.category]));

function TypeSection({ el, update }: { el: TextElement; update: Update }) {
  const { isBold, isItalic } = parseKonvaFontStyle(el.fontStyle);
  const isUnderline = el.textDecoration === "underline";
  const isUppercase = el.textTransform === "uppercase";
  const category = FONT_CATEGORY.get(el.fontFamily);
  const face = resolveFontFamily(el.fontFamily);

  return (
    <Section code="B" label="Type">
      <textarea
        value={el.text}
        aria-label="Text content"
        onChange={(e) => update({ text: e.target.value })}
        rows={2}
        className="w-full bg-surface-3 text-[12.5px] text-text-primary px-2 py-1.5 outline-none focus:bg-surface-1 focus:shadow-[inset_0_0_0_1.5px_var(--selection)] resize-none"
      />
      <FontSelect value={el.fontFamily} onChange={(fontFamily) => update({ fontFamily })}>
        <div className="flex items-center gap-2.5 p-2 border border-border-default hover:border-text-primary transition-colors">
          <span className="w-11 h-11 shrink-0 flex items-center justify-center bg-surface-3 text-[24px] text-text-primary" style={{ fontFamily: face }}>
            Aa
          </span>
          <span className="flex flex-col gap-px min-w-0">
            <span className="text-[16px] text-text-primary truncate" style={{ fontFamily: face }}>
              {el.fontFamily}
            </span>
            <span className="font-mono text-[10.5px] uppercase text-text-tertiary">
              {category ? FONT_CATEGORY_LABELS[category] : "Font"} · Change ▾
            </span>
          </span>
        </div>
      </FontSelect>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField label="SZ" title="Font size" value={el.fontSize} onChange={(v) => update({ fontSize: v })} min={8} />
        <NumberField
          label="LH"
          title="Line height"
          value={el.lineHeight || 1.2}
          onChange={(v) => update({ lineHeight: v })}
          step={0.1}
          min={0.5}
          max={4}
        />
      </div>
      <CellRow cols={7}>
        <Cell label="Bold" active={isBold} className="font-extrabold" onClick={() => update({ fontStyle: buildKonvaFontStyle(!isBold, isItalic) } as Partial<EditorElement>)}>
          B
        </Cell>
        <Cell label="Italic" active={isItalic} className="italic" onClick={() => update({ fontStyle: buildKonvaFontStyle(isBold, !isItalic) } as Partial<EditorElement>)}>
          I
        </Cell>
        <Cell label="Underline" active={isUnderline} className="underline" onClick={() => update({ textDecoration: isUnderline ? "" : "underline" } as Partial<EditorElement>)}>
          U
        </Cell>
        <Cell label="Uppercase" active={isUppercase} onClick={() => update({ textTransform: isUppercase ? "none" : "uppercase" } as Partial<EditorElement>)}>
          Aa
        </Cell>
        {(["left", "center", "right"] as const).map((a) => (
          <Cell key={a} label={`Align ${a}`} active={el.align === a} onClick={() => update({ align: a })}>
            <AlignIcon align={a} />
          </Cell>
        ))}
      </CellRow>
    </Section>
  );
}

function ColorSection({ code, fill, onChange }: { code: string; fill: string; onChange: (hex: string) => void }) {
  return (
    <Section code={code} label="Color" right={<HexReadout value={fill} />}>
      <SwatchRow value={fill} onChange={onChange} />
    </Section>
  );
}

function StrokeSection({ code, el, update }: { code: string; el: ShapeElement; update: Update }) {
  const stroke = el.stroke || "#000000";
  const strokeWidth = el.strokeWidth || 0;
  return (
    <Section code={code} label="Stroke" right={strokeWidth > 0 ? <HexReadout value={stroke} /> : undefined}>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField
          label="W"
          title="Stroke width"
          unit="PX"
          value={strokeWidth}
          onChange={(v) => update({ strokeWidth: v, stroke: v > 0 && !el.stroke ? "#000000" : el.stroke } as Partial<EditorElement>)}
          min={0}
          max={50}
        />
      </div>
      {strokeWidth > 0 && <SwatchRow value={stroke} onChange={(hex) => update({ stroke: hex } as Partial<EditorElement>)} />}
    </Section>
  );
}

const SHADOW_PRESETS = [
  { label: "Soft", values: { shadowBlur: 12, shadowOffsetX: 0, shadowOffsetY: 4, shadowOpacity: 0.4, shadowColor: "#000000" } },
  { label: "Hard", values: { shadowBlur: 0, shadowOffsetX: 6, shadowOffsetY: 6, shadowOpacity: 1, shadowColor: "#000000" } },
  { label: "Glow", values: { shadowBlur: 20, shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0.8, shadowColor: "#FFFFFF" } },
];

function AddRemove({ on, onAdd, onRemove, what }: { on: boolean; onAdd: () => void; onRemove: () => void; what: string }) {
  return (
    <button
      type="button"
      onClick={on ? onRemove : onAdd}
      aria-label={on ? `Remove ${what}` : `Add ${what}`}
      className="font-mono text-[13px] leading-none text-text-tertiary hover:text-text-primary px-1 focus-visible:outline-2 focus-visible:outline-selection"
    >
      {on ? "−" : "+"}
    </button>
  );
}

function TextShadowSection({ el, update }: { el: TextElement; update: Update }) {
  const blur = el.shadowBlur || 0;
  const offsetX = el.shadowOffsetX || 0;
  const offsetY = el.shadowOffsetY || 0;
  const opacity = el.shadowOpacity ?? 1;
  const color = el.shadowColor || "#000000";
  const on = blur > 0 || offsetX !== 0 || offsetY !== 0;

  return (
    <Section
      code="D"
      label="Shadow"
      right={
        <AddRemove
          what="shadow"
          on={on}
          onAdd={() => update(SHADOW_PRESETS[0].values as Partial<EditorElement>)}
          onRemove={() => update({ shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0 } as Partial<EditorElement>)}
        />
      }
    >
      {on && (
        <>
          <CellRow cols={3}>
            {SHADOW_PRESETS.map((p) => (
              <Cell
                key={p.label}
                label={`${p.label} shadow`}
                active={blur === p.values.shadowBlur && offsetX === p.values.shadowOffsetX && offsetY === p.values.shadowOffsetY}
                onClick={() => update(p.values as Partial<EditorElement>)}
              >
                {p.label}
              </Cell>
            ))}
          </CellRow>
          <div className="grid grid-cols-2 gap-1.5">
            <NumberField label="B" title="Shadow blur" unit="PX" value={blur} onChange={(v) => update({ shadowBlur: v } as Partial<EditorElement>)} min={0} max={100} />
            <NumberField
              label="O"
              title="Shadow opacity"
              unit="%"
              value={Math.round(opacity * 100)}
              onChange={(v) => update({ shadowOpacity: v / 100 } as Partial<EditorElement>)}
              min={0}
              max={100}
            />
            <NumberField label="X" title="Shadow offset X" unit="PX" value={offsetX} onChange={(v) => update({ shadowOffsetX: v } as Partial<EditorElement>)} min={-100} max={100} />
            <NumberField label="Y" title="Shadow offset Y" unit="PX" value={offsetY} onChange={(v) => update({ shadowOffsetY: v } as Partial<EditorElement>)} min={-100} max={100} />
          </div>
          <div className="flex items-center gap-2">
            <ColorPicker value={color} size="sm" onChange={(hex) => update({ shadowColor: hex } as Partial<EditorElement>)} />
            <HexReadout value={color} />
          </div>
        </>
      )}
    </Section>
  );
}

function ImageShadowSection({ el, update }: { el: ImageElement; update: Update }) {
  const blur = el.shadowBlur || 0;
  const color = el.shadowColor || "#000000";
  return (
    <Section
      code="D"
      label="Shadow"
      right={
        <AddRemove
          what="shadow"
          on={blur > 0}
          onAdd={() => update({ shadowBlur: 20, shadowColor: color } as Partial<EditorElement>)}
          onRemove={() => update({ shadowBlur: 0 } as Partial<EditorElement>)}
        />
      }
    >
      {blur > 0 && (
        <div className="grid grid-cols-2 gap-1.5 items-center">
          <NumberField label="B" title="Shadow blur" unit="PX" value={blur} onChange={(v) => update({ shadowBlur: v } as Partial<EditorElement>)} min={0} max={100} />
          <div className="flex items-center gap-2">
            <ColorPicker value={color} size="sm" onChange={(hex) => update({ shadowColor: hex } as Partial<EditorElement>)} />
            <HexReadout value={color} />
          </div>
        </div>
      )}
    </Section>
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

function ImageSection({ el, update }: { el: ImageElement; update: Update }) {
  return (
    <Section code="B" label="Image">
      <CellRow cols={2}>
        <Cell label="Flip horizontal" active={!!el.flipX} className="gap-1.5" onClick={() => update({ flipX: !el.flipX } as Partial<EditorElement>)}>
          <FlipIcon direction="h" /> Flip H
        </Cell>
        <Cell label="Flip vertical" active={!!el.flipY} className="gap-1.5" onClick={() => update({ flipY: !el.flipY } as Partial<EditorElement>)}>
          <FlipIcon direction="v" /> Flip V
        </Cell>
      </CellRow>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField
          label="◜"
          title="Corner radius"
          unit="PX"
          value={el.cornerRadius || 0}
          onChange={(v) => update({ cornerRadius: v } as Partial<EditorElement>)}
          min={0}
          max={Math.min(el.width, el.height) / 2}
        />
      </div>
    </Section>
  );
}

const FILTER_PRESETS: { label: string; values: Partial<ImageElement> }[] = [
  { label: "None", values: { filterBlur: 0, filterBrightness: 0, filterContrast: 0, filterSaturation: 0, filterGrayscale: false, filterSepia: false, filterInvert: false } },
  { label: "B&W", values: { filterGrayscale: true, filterSepia: false, filterContrast: 10 } },
  { label: "Sepia", values: { filterSepia: true, filterGrayscale: false, filterSaturation: 0 } },
  { label: "Pop", values: { filterContrast: 20, filterSaturation: 1.5, filterBrightness: 0.05 } },
  { label: "Faded", values: { filterContrast: -15, filterSaturation: -0.8, filterBrightness: 0.1 } },
  { label: "Drama", values: { filterContrast: 30, filterBrightness: -0.1, filterSaturation: 0.3 } },
];

function ImageFiltersSection({ el, update }: { el: ImageElement; update: Update }) {
  return (
    <Section code="C" label="Filters">
      <div className="grid grid-cols-3 border-l border-t border-border-default">
        {FILTER_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => update(p.values as Partial<EditorElement>)}
            className="h-7 border-r border-b border-border-default text-[12px] text-text-secondary hover:bg-surface-3 hover:text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumberField label="BL" title="Blur" value={el.filterBlur || 0} onChange={(v) => update({ filterBlur: v } as Partial<EditorElement>)} min={0} max={40} />
        <NumberField
          label="BR"
          title="Brightness"
          value={Math.round((el.filterBrightness || 0) * 100)}
          onChange={(v) => update({ filterBrightness: v / 100 } as Partial<EditorElement>)}
          min={-100}
          max={100}
        />
        <NumberField label="CO" title="Contrast" value={el.filterContrast || 0} onChange={(v) => update({ filterContrast: v } as Partial<EditorElement>)} min={-100} max={100} />
        <NumberField
          label="SA"
          title="Saturation"
          value={Math.round((el.filterSaturation || 0) * 10)}
          onChange={(v) => update({ filterSaturation: v / 10 } as Partial<EditorElement>)}
          min={-20}
          max={100}
        />
      </div>
      <CellRow cols={3}>
        {([
          { key: "filterGrayscale", label: "B&W" },
          { key: "filterSepia", label: "Sepia" },
          { key: "filterInvert", label: "Invert" },
        ] as const).map((t) => (
          <Cell key={t.key} label={t.label} active={!!el[t.key]} onClick={() => update({ [t.key]: !el[t.key] } as Partial<EditorElement>)}>
            {t.label}
          </Cell>
        ))}
      </CellRow>
    </Section>
  );
}

/* ---------------------------------------------------------------------------
   Page (nothing selected) — background
--------------------------------------------------------------------------- */

const LINEAR_DIRECTIONS: {
  label: string;
  name: string;
  startX: number; startY: number; endX: number; endY: number;
}[] = [
  { label: "↓", name: "down", startX: 0, startY: 0, endX: 0, endY: 1 },
  { label: "→", name: "right", startX: 0, startY: 0, endX: 1, endY: 0 },
  { label: "↘", name: "down-right", startX: 0, startY: 0, endX: 1, endY: 1 },
  { label: "↙", name: "down-left", startX: 1, startY: 0, endX: 0, endY: 1 },
  { label: "↑", name: "up", startX: 0, startY: 1, endX: 0, endY: 0 },
  { label: "←", name: "left", startX: 1, startY: 0, endX: 0, endY: 0 },
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

  const mode: "solid" | "linear" | "radial" = backgroundGradient ? backgroundGradient.type : "solid";

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
      setBackgroundGradient({ type: "linear", startX: 0, startY: 0, endX: 0, endY: 1, colorStops: [0, startColor, 1, endColor] });
      return;
    }
    setBackgroundGradient({
      type: "radial",
      startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5,
      startRadius: 0, endRadius: 0.7,
      colorStops: [0, startColor, 1, endColor],
    });
  };

  const updateColors = (s: string, e: string) => {
    if (!backgroundGradient) return;
    setBackgroundGradient({ ...backgroundGradient, colorStops: [0, s, 1, e] });
  };

  const activeDirection = LINEAR_DIRECTIONS.findIndex(
    (d) =>
      backgroundGradient?.type === "linear" &&
      d.startX === backgroundGradient.startX &&
      d.startY === backgroundGradient.startY &&
      d.endX === backgroundGradient.endX &&
      d.endY === backgroundGradient.endY
  );

  return (
    <Section code="A" label="Background" right={mode === "solid" ? <HexReadout value={backgroundColor} /> : undefined}>
      <Segmented
        options={[
          { value: "solid", label: "Solid" },
          { value: "linear", label: "Linear" },
          { value: "radial", label: "Radial" },
        ]}
        value={mode}
        onChange={applyMode}
      />

      {mode === "solid" && <SwatchRow value={backgroundColor} onChange={setBackgroundColor} />}

      {(mode === "linear" || mode === "radial") && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {([
              ["Start", startColor, (hex: string) => updateColors(hex, endColor)],
              ["End", endColor, (hex: string) => updateColors(startColor, hex)],
            ] as const).map(([label, c, set]) => (
              <div key={label} className="flex flex-col gap-1">
                <Caption>{label}</Caption>
                <div className="flex items-center gap-2">
                  <ColorPicker value={c} size="sm" onChange={set} />
                  <HexReadout value={c} />
                </div>
              </div>
            ))}
          </div>

          {mode === "linear" && (
            <div className="flex flex-col gap-1">
              <Caption>Direction</Caption>
              <CellRow cols={6}>
                {LINEAR_DIRECTIONS.map((d, i) => (
                  <Cell
                    key={d.label}
                    label={`Gradient direction ${d.name}`}
                    active={activeDirection === i}
                    onClick={() =>
                      backgroundGradient?.type === "linear" &&
                      setBackgroundGradient({ ...backgroundGradient, startX: d.startX, startY: d.startY, endX: d.endX, endY: d.endY })
                    }
                  >
                    {d.label}
                  </Cell>
                ))}
              </CellRow>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <Caption>Presets</Caption>
            <div className="grid grid-cols-5 gap-1.5">
              {GRADIENT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => updateColors(p.colors[0], p.colors[1])}
                  title={p.name}
                  aria-label={`${p.name} gradient`}
                  className="aspect-square shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] hover:shadow-[0_0_0_1px_var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
                  style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </Section>
  );
}

function PageHeader() {
  const pageIndex = useEditorStore((s) => Math.max(0, s.pages.findIndex((p) => p.id === s.activePageId)));
  const format = useEditorStore((s) => s.format);
  return (
    <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-border-default">
      <span className="w-8 h-8 shrink-0 flex items-center justify-center bg-surface-3 text-text-secondary">
        <span className="w-3.5 h-3.5 border-[1.5px] border-current" />
      </span>
      <div className="flex flex-col min-w-0">
        <span className="font-mono text-[10.5px] text-text-tertiary">NOTHING SELECTED · PAGE</span>
        <span className="text-[17px] font-bold truncate text-text-primary" style={{ fontStretch: "110%" }}>
          Page {pageIndex + 1}
          <span className="ml-2 font-mono text-[11px] font-normal text-text-tertiary">
            {format.width} × {format.height}
          </span>
        </span>
      </div>
    </div>
  );
}

function MultiSelection() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const removeSelectedElements = useEditorStore((s) => s.removeSelectedElements);
  const duplicateSelectedElements = useEditorStore((s) => s.duplicateSelectedElements);
  const updateMultipleElements = useEditorStore((s) => s.updateMultipleElements);
  const elements = useEditorStore((s) => s.elements);
  const first = elements.find((el) => selectedIds.includes(el.id));

  return (
    <>
      <div className="px-4 py-3.5 flex items-center gap-2.5 border-b border-border-default">
        <span className="w-8 h-8 shrink-0 flex items-center justify-center bg-surface-3 text-text-primary">
          <LayersIcon className="w-4 h-4" />
        </span>
        <div className="flex flex-col">
          <span className="font-mono text-[10.5px] text-text-tertiary">SELECTED · {selectedIds.length} LAYERS</span>
          <span className="text-[17px] font-bold text-text-primary" style={{ fontStretch: "110%" }}>
            Multiple
          </span>
        </div>
      </div>
      <Section code="A" label="Layers">
        <div className="grid grid-cols-2 gap-1.5">
          <NumberField
            label="O"
            title="Opacity"
            unit="%"
            value={Math.round((first?.opacity ?? 1) * 100)}
            min={0}
            max={100}
            onChange={(v) => {
              const updates = new Map<string, { opacity: number }>();
              for (const id of selectedIds) updates.set(id, { opacity: v / 100 });
              updateMultipleElements(updates);
            }}
          />
        </div>
        <div className="flex gap-2">
          <SmallButton onClick={duplicateSelectedElements}>Duplicate all</SmallButton>
          <SmallButton
            danger
            onClick={() => {
              const count = selectedIds.length;
              removeSelectedElements();
              toastDeleted(count);
            }}
          >
            Delete all
          </SmallButton>
        </div>
      </Section>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Layers
--------------------------------------------------------------------------- */

const GLYPH: Record<string, string> = { text: "T", image: "▣", rectangle: "■", ellipse: "●", triangle: "▲", line: "—" };

function SortableLayerItem({ el, isSelected }: { el: EditorElement; isSelected: boolean }) {
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const removeElement = useEditorStore((s) => s.removeElement);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: el.id });

  const glyph = el.type === "shape" ? GLYPH[el.shapeType] : GLYPH[el.type];
  const flag = el.hidden ? "HIDDEN" : el.locked ? "LOCKED" : "";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : undefined }}
      onClick={(e) => selectElement(el.id, e.shiftKey)}
      {...attributes}
      {...listeners}
      aria-label={`${elementLabel(el)} — drag to reorder`}
      className={cx(
        "group flex items-center gap-2 h-[38px] pl-3 pr-3 border-b border-border-default cursor-pointer select-none outline-none",
        "focus-visible:shadow-[inset_0_0_0_2px_var(--selection)]",
        isSelected ? "bg-selection-tint shadow-[inset_3px_0_0_var(--selection)]" : "hover:bg-surface-3",
        el.hidden ? "text-text-tertiary" : "text-text-primary"
      )}
    >
      <span className="w-5 h-5 shrink-0 flex items-center justify-center bg-surface-3 font-mono text-[10px] font-medium">
        {glyph}
      </span>
      <span className={cx("flex-1 min-w-0 truncate text-[13px]", isSelected ? "font-bold" : "font-medium")}>
        {elementLabel(el, 26)}
      </span>
      {flag && <span className="font-mono text-[10.5px] text-text-tertiary group-hover:hidden">{flag}</span>}
      <span className="hidden group-hover:flex group-focus-within:flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateElement(el.id, { hidden: !el.hidden });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={el.hidden ? "Show layer" : "Hide layer"}
          aria-pressed={el.hidden}
          title={el.hidden ? "Show" : "Hide"}
          className={cx("p-0.5", el.hidden ? "text-text-primary" : "text-text-tertiary hover:text-text-primary")}
        >
          <EyeIcon />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateElement(el.id, { locked: !el.locked });
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={el.locked ? "Unlock layer" : "Lock layer"}
          aria-pressed={el.locked}
          title={el.locked ? "Unlock" : "Lock"}
          className={cx("p-0.5", el.locked ? "text-text-primary" : "text-text-tertiary hover:text-text-primary")}
        >
          <LockIcon />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            const label = elementLabel(el);
            removeElement(el.id);
            toastDeleted(1, label);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Delete layer"
          title="Delete"
          className="p-0.5 text-text-tertiary hover:text-danger"
        >
          <TrashIcon />
        </button>
      </span>
    </div>
  );
}

function LayersTab() {
  const elements = useEditorStore((s) => s.elements);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const reorderElements = useEditorStore((s) => s.reorderElements);
  const pageIndex = useEditorStore((s) => Math.max(0, s.pages.findIndex((p) => p.id === s.activePageId)));

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
    reorderElements(elements.length - 1 - oldVisualIndex, elements.length - 1 - newVisualIndex);
  };

  return (
    <div className="animate-panel-in">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default">
        <span className="font-mono text-[10.5px] text-text-tertiary">
          PAGE {String(pageIndex + 1).padStart(2, "0")} · TOP TO BOTTOM
        </span>
      </div>
      {elements.length === 0 ? (
        <p className="px-4 py-6 font-mono text-[10.5px] uppercase text-text-tertiary text-center">No layers on this page</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={reversedIds} strategy={verticalListSortingStrategy}>
            {reversed.map((el) => (
              <SortableLayerItem key={el.id} el={el} isSelected={selectedIds.includes(el.id)} />
            ))}
          </SortableContext>
        </DndContext>
      )}
      <div className="mx-4 my-3.5 px-3 py-2.5 bg-surface-3 text-[12px] leading-[1.45] text-text-secondary">
        Drag to reorder. <kbd className="font-mono text-[11px] font-medium text-text-primary">⌘L</kbd> locks,{" "}
        <kbd className="font-mono text-[11px] font-medium text-text-primary">⌘D</kbd> duplicates.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Panel
--------------------------------------------------------------------------- */

export default function RightPanel() {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.elements);
  const updateElement = useEditorStore((s) => s.updateElement);

  const isSingle = selectedIds.length === 1;
  const selected = isSingle ? elements.find((e) => e.id === selectedIds[0]) : null;

  // Local state: nothing outside this panel reads the active tab.
  const [tab, setTab] = useState<"inspect" | "layers">("inspect");

  const update: Update = (updates) => {
    if (selected) updateElement(selected.id, updates);
  };

  const fill =
    selected?.type === "text"
      ? selected.fill
      : selected?.type === "shape" && selected.shapeType !== "line"
        ? selected.fill
        : null;

  return (
    <aside
      className={cx(
        "bg-surface-1 border-border-default overflow-y-auto shrink-0",
        // Docked from lg up; a bottom sheet below it.
        "fixed inset-x-0 bottom-0 z-30 h-[45vh] border-t shadow-modal",
        "lg:static lg:h-auto lg:w-[288px] lg:border-t-0 lg:border-l lg:shadow-none lg:z-auto"
      )}
    >
      <div className="flex border-b border-border-default sticky top-0 bg-surface-1 z-10" role="tablist">
        {(["inspect", "layers"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cx(
              "flex-1 text-left px-4 py-[13px] text-[13px] capitalize transition-colors",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
              tab === t
                ? "font-bold text-text-primary shadow-[inset_0_-2px_0_var(--text-primary)]"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            {t}
            {t === "layers" && <span className="ml-1 font-mono text-[10.5px] font-normal">{elements.length}</span>}
          </button>
        ))}
      </div>

      {tab === "layers" ? (
        <LayersTab />
      ) : (
        <div key={selected?.id ?? selectedIds.length} className="animate-panel-in">
          {selectedIds.length === 0 && (
            <>
              <PageHeader />
              <BackgroundSection />
            </>
          )}

          {selectedIds.length > 1 && <MultiSelection />}

          {selected && (
            <>
              <SelectedHeader el={selected} />
              <GeometrySection el={selected} update={update} />
              {selected.type === "text" && <TypeSection el={selected} update={update} />}
              {selected.type === "image" && (
                <>
                  <ImageSection el={selected} update={update} />
                  <ImageFiltersSection el={selected} update={update} />
                  <ImageShadowSection el={selected} update={update} />
                </>
              )}
              {fill !== null && (
                <ColorSection
                  code={selected.type === "text" ? "C" : "B"}
                  fill={fill}
                  onChange={(hex) => update({ fill: hex } as Partial<EditorElement>)}
                />
              )}
              {selected.type === "shape" && (
                <StrokeSection code={selected.shapeType === "line" ? "B" : "C"} el={selected} update={update} />
              )}
              {selected.type === "text" && <TextShadowSection el={selected} update={update} />}
            </>
          )}
        </div>
      )}
    </aside>
  );
}
