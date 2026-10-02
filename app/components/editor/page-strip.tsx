"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "../../store/editor-store";
import { MAX_PAGES } from "../../types/editor";
import { toast } from "../../store/toast-store";
import DesignThumbnail from "../design-thumbnail";
import { cx } from "../ui/cx";

const THUMB = 52;

interface MenuState {
  pageId: string;
  x: number;
  y: number;
}

/**
 * The 80px strip under the AI bar: one 52px thumbnail per page, a dashed
 * "+ ADD" tile, and the zoom readout. Page actions (duplicate / move /
 * delete) are on each thumbnail's context menu and its hover "…" button.
 */
export default function PageStrip() {
  const pages = useEditorStore((s) => s.pages);
  const activePageId = useEditorStore((s) => s.activePageId);
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const requestFit = useEditorStore((s) => s.requestFit);
  const setActivePage = useEditorStore((s) => s.setActivePage);
  const addPage = useEditorStore((s) => s.addPage);
  const [menu, setMenu] = useState<MenuState | null>(null);

  const atLimit = pages.length >= MAX_PAGES;
  const ratio = format.width / format.height;
  // Fit the page inside a 52×52 cell, keeping its real ratio.
  const tw = ratio >= 1 ? THUMB : Math.round(THUMB * ratio);
  const th = ratio >= 1 ? Math.round(THUMB / ratio) : THUMB;

  const add = () => {
    if (atLimit) {
      toast.error(`A project can hold ${MAX_PAGES} pages.`);
      return;
    }
    addPage(activePageId);
  };

  const openMenu = (pageId: string, x: number, y: number) => setMenu({ pageId, x, y });

  return (
    <div className="h-20 shrink-0 flex items-center gap-3 pl-[18px] pr-[18px] bg-surface-1 border-t border-border-default">
      <div className="flex items-center gap-3 overflow-x-auto min-w-0 py-1 px-1 -mx-1">
        {pages.map((page, index) => {
          const isActive = page.id === activePageId;
          return (
            <div key={page.id} className="group relative flex flex-col items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setActivePage(page.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openMenu(page.id, e.clientX, e.clientY);
                }}
                aria-label={`Page ${index + 1}`}
                aria-current={isActive || undefined}
                className="w-[52px] h-[52px] flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-selection"
              >
                <span
                  className={cx(
                    "block overflow-hidden",
                    isActive
                      ? "shadow-[0_0_0_2px_var(--surface-1),0_0_0_3.5px_var(--selection)]"
                      : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.07)]"
                  )}
                  style={{ width: tw, height: th }}
                >
                  <DesignThumbnail pages={[page]} format={format} className="w-full h-full" />
                </span>
              </button>
              <span
                className={cx(
                  "font-mono text-[10.5px]",
                  isActive ? "font-medium text-text-primary" : "text-text-tertiary"
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                aria-label={`Page ${index + 1} actions`}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  openMenu(page.id, r.left, r.top);
                }}
                className="absolute -top-1 -right-1 w-[18px] h-[18px] flex items-center justify-center bg-surface-inverse text-text-inverse text-[11px] leading-none opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              >
                …
              </button>
            </div>
          );
        })}

        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={add}
            disabled={atLimit}
            aria-label="Add page"
            title={atLimit ? `Limit of ${MAX_PAGES} pages` : "Add page"}
            className={cx(
              "w-[52px] h-[52px] flex items-center justify-center text-[20px] border border-dashed transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
              atLimit
                ? "border-border-default text-text-ghost cursor-not-allowed"
                : "border-text-tertiary text-text-secondary hover:text-text-primary hover:bg-surface-3"
            )}
          >
            +
          </button>
          <span className="font-mono text-[10.5px] text-text-tertiary">ADD</span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3 font-mono text-[11.5px] font-medium text-text-secondary shrink-0">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom(zoom - 10)}
          className="px-1 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-selection"
        >
          −
        </button>
        <span className="text-text-primary tabular-nums min-w-[36px] text-center" aria-live="polite">
          {zoom}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => setZoom(zoom + 10)}
          className="px-1 hover:text-text-primary focus-visible:outline-2 focus-visible:outline-selection"
        >
          +
        </button>
        <button
          type="button"
          onClick={requestFit}
          className="border border-border-default px-2.5 py-[5px] text-text-primary hover:bg-surface-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
        >
          FIT
        </button>
      </div>

      {menu && <PageMenu menu={menu} onClose={() => setMenu(null)} />}
    </div>
  );
}

function PageMenu({ menu, onClose }: { menu: MenuState; onClose: () => void }) {
  const pages = useEditorStore((s) => s.pages);
  const duplicatePage = useEditorStore((s) => s.duplicatePage);
  const removePage = useEditorStore((s) => s.removePage);
  const movePage = useEditorStore((s) => s.movePage);
  const ref = useRef<HTMLDivElement>(null);
  const index = pages.findIndex((p) => p.id === menu.pageId);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector("button")?.focus();
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (index === -1) return null;
  const atLimit = pages.length >= MAX_PAGES;

  const items: { label: string; run: () => void; disabled?: boolean; danger?: boolean }[] = [
    {
      label: "Duplicate page",
      disabled: atLimit,
      run: () => duplicatePage(menu.pageId),
    },
    { label: "Move left", disabled: index === 0, run: () => movePage(menu.pageId, "up") },
    {
      label: "Move right",
      disabled: index === pages.length - 1,
      run: () => movePage(menu.pageId, "down"),
    },
    {
      label: "Delete page",
      danger: true,
      disabled: pages.length <= 1,
      run: () => removePage(menu.pageId),
    },
  ];

  // Opens upward — the strip sits at the bottom of the window. Portalled to
  // body: an ancestor transform would otherwise capture `fixed`.
  return createPortal(
    <div
      ref={ref}
      role="menu"
      className="fixed z-50 min-w-[168px] bg-surface-2 border border-border-default rounded-float shadow-pop py-1 animate-scale-in"
      // Anchored by `bottom`, not a transform — animate-scale-in owns transform.
      style={{ left: menu.x, bottom: window.innerHeight - menu.y + 6 }}
    >
      {items.map((it) => (
        <button
          key={it.label}
          role="menuitem"
          type="button"
          disabled={it.disabled}
          onClick={() => {
            it.run();
            onClose();
          }}
          className={cx(
            "w-full text-left px-3 py-1.5 text-[12.5px] transition-colors disabled:opacity-35 disabled:pointer-events-none",
            "focus-visible:outline-none focus-visible:bg-surface-3",
            it.danger ? "text-danger hover:bg-danger-tint" : "text-text-primary hover:bg-surface-3"
          )}
        >
          {it.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
