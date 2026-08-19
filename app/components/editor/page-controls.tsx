"use client";

import { useEditorStore } from "../../store/editor-store";
import { stackGeometry } from "../../lib/canvas-layout";
import { MAX_PAGES } from "../../types/editor";
import { toast } from "../../store/toast-store";
import IconButton from "../ui/icon-button";
import { cx } from "../ui/cx";
import {
  PlusIcon,
  TrashIcon,
  DuplicateIcon,
  BringForwardIcon,
  SendBackwardIcon,
} from "./icons";

/**
 * The per-artboard chrome: a label strip above each page and an "Add page"
 * button under the last one. A DOM overlay rather than Konva nodes, so the
 * controls keep a constant size while the artboards they label zoom.
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
  const addPage = useEditorStore((s) => s.addPage);
  const duplicatePage = useEditorStore((s) => s.duplicatePage);
  const removePage = useEditorStore((s) => s.removePage);
  const movePage = useEditorStore((s) => s.movePage);

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
  const atLimit = pages.length >= MAX_PAGES;

  const handleAdd = (afterId?: string) => {
    if (atLimit) {
      toast.error(`A project can hold ${MAX_PAGES} pages.`);
      return;
    }
    addPage(afterId);
  };

  return (
    <>
      {pages.map((page, index) => {
        const isActive = page.id === activePageId;
        const top = geometry.pageTop(index);
        return (
          <div
            key={page.id}
            className="absolute z-10 flex items-center justify-between gap-2 pointer-events-none"
            style={{ left: geometry.offsetX, top: top - 26, width: boardWidth, height: 22 }}
          >
            <button
              onClick={() => setActivePage(page.id)}
              className={cx(
                "pointer-events-auto text-[11px] font-medium px-1.5 py-0.5 rounded-sm transition-colors duration-150 ease-standard",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive
                  ? "text-text-primary"
                  : "text-text-ghost hover:text-text-secondary"
              )}
            >
              Page {index + 1}
              {isActive && pages.length > 1 && (
                <span className="text-text-ghost"> of {pages.length}</span>
              )}
            </button>

            {/* Only the active page carries actions — showing five buttons on
                every artboard would compete with the designs themselves. */}
            {isActive && (
              <div className="pointer-events-auto flex items-center gap-0.5">
                <IconButton
                  label="Move page up"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => movePage(page.id, "up")}
                >
                  <SendBackwardIcon className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  label="Move page down"
                  size="sm"
                  disabled={index === pages.length - 1}
                  onClick={() => movePage(page.id, "down")}
                >
                  <BringForwardIcon className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  label="Duplicate page"
                  size="sm"
                  onClick={() => (atLimit ? handleAdd() : duplicatePage(page.id))}
                >
                  <DuplicateIcon className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  label="Delete page"
                  size="sm"
                  variant="danger"
                  disabled={pages.length <= 1}
                  onClick={() => removePage(page.id)}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  label="Add page below"
                  size="sm"
                  onClick={() => handleAdd(page.id)}
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                </IconButton>
              </div>
            )}
          </div>
        );
      })}

      {/* Add-page affordance under the stack */}
      <div
        className="absolute z-10 flex justify-center"
        style={{
          left: geometry.offsetX,
          top: geometry.pageTop(pages.length - 1) + format.height * scale + 16,
          width: boardWidth,
        }}
      >
        <button
          onClick={() => handleAdd()}
          disabled={atLimit}
          className={cx(
            "flex items-center gap-1.5 text-[11.5px] font-medium px-3 py-1.5 rounded-md border border-dashed transition-colors duration-150 ease-standard",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            atLimit
              ? "border-border-subtle text-text-ghost cursor-not-allowed"
              : "border-border-default text-text-secondary hover:text-text-primary hover:bg-surface-2"
          )}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          {atLimit ? `Limit of ${MAX_PAGES} pages` : "Add page"}
        </button>
      </div>
    </>
  );
}
