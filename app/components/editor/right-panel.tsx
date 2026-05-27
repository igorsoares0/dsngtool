"use client";

import { useState } from "react";
import { useEditorStore } from "../../store/editor-store";
import { ChevronDownIcon, LayersIcon, LockIcon, EyeIcon, TrashIcon } from "./icons";
import type { EditorElement, TextElement, ShapeElement } from "../../types/editor";

type Section = "position" | "typography" | "fill" | "effects" | "layers";

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
      className="w-full flex items-center justify-between py-2 group"
    >
      <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider group-hover:text-text-primary transition-colors">
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
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-text-ghost uppercase">{label}</span>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent-green/40 transition-colors w-full tabular-nums"
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

function TypographySection({ el, update }: { el: TextElement; update: (u: Partial<EditorElement>) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-[10px] text-text-ghost uppercase">Text</span>
        <textarea
          value={el.text}
          onChange={(e) => update({ text: e.target.value })}
          rows={2}
          className="w-full mt-1 bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent-green/40 transition-colors resize-none"
        />
      </div>
      <div>
        <span className="text-[10px] text-text-ghost uppercase">Font</span>
        <select
          value={el.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value })}
          className="w-full mt-1 bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent-green/40 transition-colors"
        >
          {["Arial", "Georgia", "Times New Roman", "Verdana", "Courier New", "Impact"].map(
            (f) => (
              <option key={f} value={f}>
                {f}
              </option>
            )
          )}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Size" value={el.fontSize} onChange={(v) => update({ fontSize: v })} min={8} />
        <NumberField label="Line H." value={el.lineHeight || 1.2} onChange={(v) => update({ lineHeight: v })} step={0.1} min={0.5} max={4} />
      </div>
      <div>
        <span className="text-[10px] text-text-ghost uppercase">Align</span>
        <div className="flex mt-1 bg-surface-2 rounded-md p-0.5 border border-border-subtle">
          {(["left", "center", "right"] as const).map((a) => (
            <button
              key={a}
              onClick={() => update({ align: a })}
              className={`flex-1 py-1.5 text-[10px] rounded capitalize transition-all ${
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
        <input
          type="color"
          value={fill}
          onChange={(e) => update({ fill: e.target.value } as Partial<EditorElement>)}
          className="w-8 h-8 rounded-md border border-border-default cursor-pointer bg-transparent"
        />
        <input
          type="text"
          value={fill}
          onChange={(e) => update({ fill: e.target.value } as Partial<EditorElement>)}
          className="flex-1 bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent-green/40 transition-colors font-mono uppercase"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => update({ fill: c } as Partial<EditorElement>)}
            className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
              fill === c ? "border-accent-green scale-110" : "border-border-subtle"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

function LayersSection() {
  const elements = useEditorStore((s) => s.elements);
  const selectedId = useEditorStore((s) => s.selectedId);
  const selectElement = useEditorStore((s) => s.selectElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const removeElement = useEditorStore((s) => s.removeElement);
  const moveElement = useEditorStore((s) => s.moveElement);

  return (
    <div className="space-y-1">
      {[...elements].reverse().map((el) => (
        <div
          key={el.id}
          onClick={() => selectElement(el.id)}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors group cursor-pointer ${
            selectedId === el.id
              ? "bg-surface-3 border border-border-default"
              : "hover:bg-surface-2 border border-transparent"
          }`}
        >
          <div className="w-6 h-6 rounded bg-surface-3 flex items-center justify-center shrink-0">
            <span className="text-[9px] text-text-ghost uppercase">
              {el.type[0]}
            </span>
          </div>
          <span className="text-xs text-text-secondary flex-1 truncate">
            {el.type === "text" ? (el as TextElement).text.slice(0, 20) : `${el.type} ${el.id.slice(-4)}`}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); updateElement(el.id, { hidden: !el.hidden }); }}
              className={`p-0.5 ${el.hidden ? "text-accent-pink" : "text-text-ghost hover:text-text-tertiary"}`}
            >
              <EyeIcon />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); updateElement(el.id, { locked: !el.locked }); }}
              className={`p-0.5 ${el.locked ? "text-accent-blue" : "text-text-ghost hover:text-text-tertiary"}`}
            >
              <LockIcon />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
              className="p-0.5 text-text-ghost hover:text-accent-pink"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      ))}
      {elements.length === 0 && (
        <p className="text-[11px] text-text-ghost text-center py-4">No elements</p>
      )}
    </div>
  );
}

export default function RightPanel() {
  const selectedId = useEditorStore((s) => s.selectedId);
  const elements = useEditorStore((s) => s.elements);
  const updateElement = useEditorStore((s) => s.updateElement);

  const selected = selectedId ? elements.find((e) => e.id === selectedId) : null;

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
    <aside className="w-[260px] bg-surface-1 border-l border-border-subtle overflow-y-auto shrink-0">
      <div className="p-4 space-y-1">
        <h2 className="text-xs font-bold text-text-primary font-[family-name:var(--font-dm-sans)] mb-3">
          Properties
        </h2>

        {/* Position & Size — only when element selected */}
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

        {/* Fill — for text + shapes */}
        {selected && (selected.type === "text" || selected.type === "shape") && (
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

        {/* Always show layers */}
        <div className="border-b border-border-subtle pb-2 last:border-0">
          <SectionHeader
            label="Layers"
            isOpen={openSections.has("layers")}
            onToggle={() => toggleSection("layers")}
          />
          {openSections.has("layers") && (
            <div className="pb-2 animate-fade-in">
              <LayersSection />
            </div>
          )}
        </div>

        {!selected && (
          <p className="text-[11px] text-text-ghost text-center py-6">
            Select an element to edit properties
          </p>
        )}
      </div>
    </aside>
  );
}
