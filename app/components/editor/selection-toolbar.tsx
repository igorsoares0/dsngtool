"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editor-store";
import { toastDeleted } from "../../store/toast-store";
import { resolveFontFamily } from "../../lib/fonts";
import { elementLabel } from "../../lib/element-label";
import FontSelect from "./font-select";
import {
  DuplicateIcon,
  BringForwardIcon,
  LockIcon,
  TrashIcon,
} from "./icons";
import { cx } from "../ui/cx";

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function ToolbarButton({
  title,
  onClick,
  active,
  danger,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "w-8 flex items-center justify-center rounded-float transition-colors duration-150 ease-standard",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
        danger ? "text-danger-on-inverse" : "text-text-inverse",
        active ? "bg-[rgb(128_128_128/0.32)]" : "hover:bg-[rgb(128_128_128/0.22)]"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px my-2 mx-[3px] bg-[rgb(128_128_128/0.4)] shrink-0" />;
}

/**
 * The floating ink toolbar over the selection. The badge under the selection
 * (kind | W × H) is drawn separately by `SelectionBadge`.
 */
export default function SelectionToolbar({
  rect,
  containerWidth,
}: {
  rect: SelectionRect;
  containerWidth: number;
}) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.elements);
  const duplicateSelectedElements = useEditorStore((s) => s.duplicateSelectedElements);
  const removeSelectedElements = useEditorStore((s) => s.removeSelectedElements);
  const moveElement = useEditorStore((s) => s.moveElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateMultipleElements = useEditorStore((s) => s.updateMultipleElements);

  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const isSingle = selectedIds.length === 1;
  const single = isSingle ? elements.find((e) => e.id === selectedIds[0]) : null;
  const selectedEls = elements.filter((e) => selectedIds.includes(e.id));
  const allLocked = selectedEls.length > 0 && selectedEls.every((e) => e.locked);
  const text = single?.type === "text" ? single : null;
  const fill = single && single.type !== "image" ? single.fill : null;

  // Measure after layout so we can center/flip accurately.
  useLayoutEffect(() => {
    if (ref.current) {
      setSize({ width: ref.current.offsetWidth, height: ref.current.offsetHeight });
    }
  }, [selectedIds.length, allLocked, text?.fontFamily, text?.fontSize, fill]);

  // The rotate handle lives at the bottom-center of the selection
  // (Transformer rotateAnchorAngle=180) and the dimension badge bottom-right,
  // so the top is clear for the toolbar. Above: only clear the resize anchors.
  // Below: clear the rotate handle and the badge. Handles are fixed screen
  // pixels, so this is zoom-independent.
  const gap = 12;
  const aboveOffset = gap + 6;
  const belowOffset = gap + 30;
  const centerX = rect.x + rect.width / 2;

  // Position by final edges — NOT via a CSS transform. The entrance animation
  // animates `transform`, which would override an inline transform and break
  // both the centering and the vertical flip. Size is measured in
  // useLayoutEffect, so edges are exact before paint.
  const left = Math.max(
    8,
    Math.min(containerWidth - size.width - 8, centerX - size.width / 2)
  );
  const placeBelow = rect.y - aboveOffset - size.height < 8;
  const top = placeBelow
    ? rect.y + rect.height + belowOffset
    : rect.y - aboveOffset - size.height;

  const toggleLock = () => {
    if (isSingle && single) {
      updateElement(single.id, { locked: !single.locked });
      return;
    }
    const updates = new Map<string, { locked: boolean }>();
    for (const id of selectedIds) updates.set(id, { locked: !allLocked });
    updateMultipleElements(updates);
  };

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label="Selection actions"
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute z-20 flex items-stretch h-[38px] p-[3px] gap-[2px] whitespace-nowrap bg-surface-inverse text-text-inverse rounded-float shadow-pop animate-scale-in"
      style={{ left, top }}
    >
      {text && (
        <>
          <FontSelect
            value={text.fontFamily}
            onChange={(fontFamily) => updateElement(text.id, { fontFamily })}
            className="flex"
          >
            <span
              className="h-full flex items-center px-[11px] text-[14px] rounded-float bg-[rgb(128_128_128/0.22)]"
              style={{ fontFamily: resolveFontFamily(text.fontFamily) }}
            >
              {text.fontFamily} ▾
            </span>
          </FontSelect>
          <span className="flex items-center px-2.5 font-mono text-[12px] font-medium tabular-nums">
            {Math.round(text.fontSize)}
          </span>
        </>
      )}

      {fill && single && (
        <label
          title="Colour"
          className="relative w-8 flex items-center justify-center cursor-pointer rounded-float hover:bg-[rgb(128_128_128/0.22)]"
        >
          <span
            className="w-4 h-4 rounded-full shadow-[0_0_0_1.5px_var(--text-inverse)]"
            style={{ background: fill }}
          />
          <input
            type="color"
            aria-label="Colour"
            value={/^#[0-9a-f]{6}$/i.test(fill) ? fill : "#000000"}
            onChange={(e) => updateElement(single.id, { fill: e.target.value })}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      )}

      {(text || fill) && <Divider />}

      <ToolbarButton title="Duplicate" onClick={duplicateSelectedElements}>
        <DuplicateIcon className="w-4 h-4" />
      </ToolbarButton>
      {isSingle && single && (
        <ToolbarButton
          title="Bring forward (⇧-click: send backward)"
          onClick={(e) => moveElement(single.id, e.shiftKey ? "down" : "up")}
        >
          <BringForwardIcon className="w-4 h-4" />
        </ToolbarButton>
      )}
      <ToolbarButton
        title={allLocked ? "Unlock" : "Lock"}
        active={allLocked}
        onClick={toggleLock}
      >
        <LockIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Delete"
        danger
        onClick={() => {
          const count = selectedIds.length;
          const label = single ? elementLabel(single) : undefined;
          removeSelectedElements();
          toastDeleted(count, label);
        }}
      >
        <TrashIcon className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

/** "TEXT | 528 × 160" under the selection's bottom-right corner, in
 *  document units. */
export function SelectionBadge({ rect, scale }: { rect: SelectionRect; scale: number }) {
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const elements = useEditorStore((s) => s.elements);
  if (selectedIds.length === 0) return null;
  const single =
    selectedIds.length === 1 ? elements.find((e) => e.id === selectedIds[0]) : null;
  const kind = single ? single.type.toUpperCase() : `${selectedIds.length} LAYERS`;
  const w = Math.round(rect.width / scale);
  const h = Math.round(rect.height / scale);

  return (
    <div
      aria-hidden
      className="absolute z-20 flex h-5 bg-selection text-white font-mono text-[10.5px] font-medium whitespace-nowrap pointer-events-none"
      style={{ left: rect.x + rect.width, top: rect.y + rect.height + 8, transform: "translateX(-100%)" }}
    >
      <span className="flex items-center px-1.5">{kind}</span>
      <span className="flex items-center px-1.5 border-l border-white/30 tabular-nums">
        {w} × {h}
      </span>
    </div>
  );
}
