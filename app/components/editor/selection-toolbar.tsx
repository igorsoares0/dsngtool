"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { useEditorStore } from "../../store/editor-store";
import {
  DuplicateIcon,
  BringForwardIcon,
  SendBackwardIcon,
  LockIcon,
  TrashIcon,
} from "./icons";

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
  onClick: () => void;
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
      className={`p-1.5 rounded-md transition-all ${
        danger
          ? "text-text-tertiary hover:text-accent-pink hover:bg-surface-3"
          : active
          ? "bg-surface-4 text-accent-green"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-3"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-4 bg-border-subtle mx-0.5 shrink-0" />;
}

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

  // Measure after layout so we can center/flip accurately.
  useLayoutEffect(() => {
    if (ref.current) {
      setSize({ width: ref.current.offsetWidth, height: ref.current.offsetHeight });
    }
  }, [selectedIds.length, allLocked]);

  const gap = 14;
  const half = size.width / 2;
  const centerX = rect.x + rect.width / 2;
  const left = Math.max(8 + half, Math.min(containerWidth - 8 - half, centerX));

  const placeBelow = rect.y - gap - size.height < 8;
  const top = placeBelow ? rect.y + rect.height + gap : rect.y - gap;
  const transform = placeBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)";

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
      className="absolute z-20 flex items-center gap-0.5 bg-surface-2 border border-border-default rounded-lg shadow-2xl px-1 py-1 animate-fade-in"
      style={{ left, top, transform }}
    >
      {isSingle && (
        <>
          <ToolbarButton
            title="Bring forward"
            onClick={() => single && moveElement(single.id, "up")}
          >
            <BringForwardIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Send backward"
            onClick={() => single && moveElement(single.id, "down")}
          >
            <SendBackwardIcon className="w-4 h-4" />
          </ToolbarButton>
          <Divider />
        </>
      )}
      <ToolbarButton title="Duplicate" onClick={duplicateSelectedElements}>
        <DuplicateIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title={allLocked ? "Unlock" : "Lock"}
        active={allLocked}
        onClick={toggleLock}
      >
        <LockIcon className="w-4 h-4" />
      </ToolbarButton>
      <Divider />
      <ToolbarButton title="Delete" danger onClick={removeSelectedElements}>
        <TrashIcon className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}
