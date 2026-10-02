"use client";

import { useEditorStore } from "../../store/editor-store";
import { stackGeometry } from "../../lib/canvas-layout";
import { cx } from "../ui/cx";

/** Crop marks: 1px ink, 16px long, starting 10px outside each corner. */
const MARK = 16;
const MARK_GAP = 10;

function CropMarks({ left, top, width, height }: { left: number; top: number; width: number; height: number }) {
  const out = MARK + MARK_GAP;
  const line = "absolute bg-text-primary";
  return (
    <div aria-hidden className="absolute z-[5] pointer-events-none" style={{ left, top, width, height }}>
      {/* top-left */}
      <span className={line} style={{ left: -out, top: -1, width: MARK, height: 1 }} />
      <span className={line} style={{ left: -1, top: -out, width: 1, height: MARK }} />
      {/* top-right */}
      <span className={line} style={{ right: -out, top: -1, width: MARK, height: 1 }} />
      <span className={line} style={{ right: -1, top: -out, width: 1, height: MARK }} />
      {/* bottom-left */}
      <span className={line} style={{ left: -out, bottom: -1, width: MARK, height: 1 }} />
      <span className={line} style={{ left: -1, bottom: -out, width: 1, height: MARK }} />
      {/* bottom-right */}
      <span className={line} style={{ right: -out, bottom: -1, width: MARK, height: 1 }} />
      <span className={line} style={{ right: -1, bottom: -out, width: 1, height: MARK }} />
    </div>
  );
}

/**
 * The per-artboard chrome: a mono label above each page and crop marks at its
 * corners. A DOM overlay rather than Konva nodes, so it keeps a constant size
 * while the artboards zoom — and never ends up in an export. Page actions
 * (add / duplicate / delete / reorder) live in the page strip under the canvas.
 */
export default function PageControls({
  containerWidth,
  containerHeight,
}: {
  containerWidth: number;
  containerHeight: number;
}) {
  const pages = useEditorStore((s) => s.pages);
  const activePageId = useEditorStore((s) => s.activePageId);
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const panX = useEditorStore((s) => s.panX);
  const panY = useEditorStore((s) => s.panY);
  const setActivePage = useEditorStore((s) => s.setActivePage);

  if (containerWidth === 0) return null;

  const scale = zoom / 100;
  const geometry = stackGeometry({
    containerWidth,
    containerHeight,
    format,
    pageCount: pages.length,
    scale,
    panX,
    panY,
  });
  const boardWidth = format.width * scale;
  const boardHeight = format.height * scale;

  return (
    <>
      {pages.map((page, index) => {
        const isActive = page.id === activePageId;
        const top = geometry.pageTop(index);
        return (
          <div key={page.id}>
            <CropMarks left={geometry.offsetX} top={top} width={boardWidth} height={boardHeight} />
            <button
              onClick={() => setActivePage(page.id)}
              className={cx(
                "absolute z-10 font-mono text-[10.5px] font-medium uppercase whitespace-nowrap transition-colors duration-150 ease-standard",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
                isActive ? "text-text-primary" : "text-text-tertiary hover:text-text-secondary"
              )}
              // Sits above the top crop marks (which reach 26px out).
              style={{ left: geometry.offsetX, top: top - 48 }}
            >
              {String(index + 1).padStart(2, "0")} — Page {index + 1} · {format.label}
            </button>
          </div>
        );
      })}
    </>
  );
}
