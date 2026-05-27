"use client";

import { useState } from "react";
import { ChevronDownIcon, LayersIcon, LockIcon, EyeIcon, TrashIcon } from "./icons";

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

function NumberInput({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-text-ghost uppercase">{label}</span>
      <input
        type="number"
        defaultValue={value}
        className="bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent-green/40 transition-colors w-full tabular-nums"
      />
    </div>
  );
}

function PositionSection() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="X" value={0} />
        <NumberInput label="Y" value={0} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="W" value={1080} />
        <NumberInput label="H" value={1080} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Rotation" value={0} />
        <NumberInput label="Opacity" value={100} />
      </div>
    </div>
  );
}

function TypographySection() {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-[10px] text-text-ghost uppercase">Font</span>
        <button className="w-full mt-1 bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md flex items-center justify-between hover:border-border-strong transition-colors">
          <span>Inter</span>
          <ChevronDownIcon />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-text-ghost uppercase">Weight</span>
          <button className="w-full mt-1 bg-surface-2 border border-border-subtle text-xs text-text-secondary px-2 py-1.5 rounded-md flex items-center justify-between hover:border-border-strong transition-colors">
            <span>Regular</span>
            <ChevronDownIcon />
          </button>
        </div>
        <NumberInput label="Size" value={16} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Line H." value={1.5} />
        <NumberInput label="Spacing" value={0} />
      </div>
      <div>
        <span className="text-[10px] text-text-ghost uppercase">Align</span>
        <div className="flex mt-1 bg-surface-2 rounded-md p-0.5 border border-border-subtle">
          {["left", "center", "right"].map((a) => (
            <button
              key={a}
              className={`flex-1 py-1.5 text-[10px] rounded capitalize transition-all ${
                a === "left"
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

function FillSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-white border border-border-default cursor-pointer hover:scale-105 transition-transform" />
        <input
          type="text"
          defaultValue="#FFFFFF"
          className="flex-1 bg-surface-2 border border-border-subtle text-xs text-text-primary px-2 py-1.5 rounded-md outline-none focus:border-accent-green/40 transition-colors font-mono"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {[
          "#000000", "#FFFFFF", "#EF4444", "#F97316", "#EAB308",
          "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280",
        ].map((c) => (
          <button
            key={c}
            className="w-6 h-6 rounded-md border border-border-subtle hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
}

function EffectsSection() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-ghost uppercase">Shadow</span>
        <button className="w-8 h-4 rounded-full bg-surface-3 relative transition-colors">
          <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-text-ghost transition-transform" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-ghost uppercase">Blur</span>
        <button className="w-8 h-4 rounded-full bg-surface-3 relative transition-colors">
          <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-text-ghost transition-transform" />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-ghost uppercase">Border</span>
        <button className="w-8 h-4 rounded-full bg-surface-3 relative transition-colors">
          <div className="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-text-ghost transition-transform" />
        </button>
      </div>
    </div>
  );
}

function LayersSection() {
  const layers = [
    { id: "1", name: "Background", type: "shape" },
    { id: "2", name: "Photo", type: "image" },
    { id: "3", name: "Heading", type: "text" },
  ];

  return (
    <div className="space-y-1">
      {layers.map((layer) => (
        <div
          key={layer.id}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-2 transition-colors group cursor-pointer"
        >
          <div className="w-6 h-6 rounded bg-surface-3 flex items-center justify-center shrink-0">
            <LayersIcon className="w-3 h-3 text-text-ghost" />
          </div>
          <span className="text-xs text-text-secondary flex-1 truncate">
            {layer.name}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-0.5 text-text-ghost hover:text-text-tertiary">
              <EyeIcon />
            </button>
            <button className="p-0.5 text-text-ghost hover:text-text-tertiary">
              <LockIcon />
            </button>
            <button className="p-0.5 text-text-ghost hover:text-accent-pink">
              <TrashIcon />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RightPanel() {
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

  const sections: { id: Section; label: string; content: () => React.JSX.Element }[] = [
    { id: "position", label: "Position & Size", content: PositionSection },
    { id: "typography", label: "Typography", content: TypographySection },
    { id: "fill", label: "Fill & Color", content: FillSection },
    { id: "effects", label: "Effects", content: EffectsSection },
    { id: "layers", label: "Layers", content: LayersSection },
  ];

  return (
    <aside className="w-[260px] bg-surface-1 border-l border-border-subtle overflow-y-auto shrink-0">
      <div className="p-4 space-y-1">
        <h2 className="text-xs font-bold text-text-primary font-[family-name:var(--font-dm-sans)] mb-3">
          Properties
        </h2>

        {sections.map((section) => {
          const Content = section.content;
          const isOpen = openSections.has(section.id);

          return (
            <div
              key={section.id}
              className="border-b border-border-subtle pb-2 last:border-0"
            >
              <SectionHeader
                label={section.label}
                isOpen={isOpen}
                onToggle={() => toggleSection(section.id)}
              />
              {isOpen && (
                <div className="pb-2 animate-fade-in">
                  <Content />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
