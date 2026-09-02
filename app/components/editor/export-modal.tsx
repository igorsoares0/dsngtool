"use client";

import { useCallback, useMemo, useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import { toast } from "../../store/toast-store";
import { downloadProjectFile, FILE_EXTENSION } from "../../lib/project-io";
import { IS_DESKTOP } from "../../lib/platform";
import { saveImagesToDisk, saveProjectToDisk } from "../../lib/desktop-files";
import type { ImageToSave } from "../../lib/desktop-bridge";
import { stackGeometry } from "../../lib/canvas-layout";
import Modal from "../ui/modal";
import { cx } from "../ui/cx";
import { DownloadIcon } from "./icons";

type ExportKind = "png" | "jpeg" | "json";

const KINDS: { id: ExportKind; label: string; hint: string }[] = [
  { id: "png", label: "PNG", hint: "Best quality" },
  { id: "jpeg", label: "JPEG", hint: "Smaller file" },
  { id: "json", label: "JSON", hint: "Project" },
];

/** Rough bytes-per-pixel for a flat, mostly-typographic design. Only ever shown
 *  prefixed with "~" — it's a expectation-setter, not a measurement. */
const BYTES_PER_PX = { png: 0.72, jpeg: 0.16 } as const;

function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ExportModal({
  open,
  onClose,
  stageRef,
}: {
  open: boolean;
  onClose: () => void;
  stageRef: React.RefObject<Konva.Stage | null>;
}) {
  const format = useEditorStore((s) => s.format);
  const zoom = useEditorStore((s) => s.zoom);
  const projectName = useEditorStore((s) => s.projectName);
  const pages = useEditorStore((s) => s.pages);
  const activePageId = useEditorStore((s) => s.activePageId);

  const [kind, setKind] = useState<ExportKind>("png");
  const [quality, setQuality] = useState(90);
  const [transparentBg, setTransparentBg] = useState(false);
  const [allPages, setAllPages] = useState(false);

  const activeIndex = Math.max(0, pages.findIndex((p) => p.id === activePageId));
  const multiPage = pages.length > 1;
  const exportedCount = multiPage && allPages ? pages.length : 1;

  const estimate = useMemo(() => {
    if (kind === "json") return null;
    const px = format.width * format.height;
    const scale = kind === "jpeg" ? quality / 90 : 1;
    return formatBytes(px * BYTES_PER_PX[kind] * scale * exportedCount);
  }, [kind, format.width, format.height, quality, exportedCount]);

  // Every page is already on the stage, stacked — so exporting page N is just
  // a different crop region, with no page switching or offscreen re-render.
  // The region has to come from the same geometry the canvas draws with,
  // including pan: this used to recompute its own centring and ignored panX/panY,
  // which silently cropped the wrong area once the user had scrolled.
  const exportImage = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    const state = useEditorStore.getState();
    const scale = zoom / 100;
    const geometry = stackGeometry({
      containerWidth: stage.width(),
      containerHeight: stage.height(),
      format,
      pageCount: state.pages.length,
      scale,
      panX: state.panX,
      panY: state.panY,
    });

    const mimeType = kind === "jpeg" ? "image/jpeg" : "image/png";
    const wantsTransparent = kind === "png" && transparentBg;
    const bgLayer = stage.getLayers()[0];
    const indices = allPages && multiPage ? state.pages.map((_, i) => i) : [activeIndex];
    const baseName = projectName || "design";
    // Desktop collects the rendered pages and hands them to one native dialog;
    // the browser has to fire a download per page as it goes.
    const rendered: ImageToSave[] = [];

    for (const index of indices) {
      const page = state.pages[index];
      // Hide only this page's artboard: the others are outside the crop, but a
      // blanket hide would also clear the one being captured on the next pass.
      const bgRect = wantsTransparent
        ? bgLayer?.findOne(`#bg-rect-${page.id}`)
        : undefined;
      bgRect?.hide();

      const dataUrl = stage.toDataURL({
        x: geometry.offsetX,
        y: geometry.pageTop(index),
        width: format.width * scale,
        height: format.height * scale,
        pixelRatio: 1 / scale,
        mimeType,
        quality: kind === "jpeg" ? quality / 100 : undefined,
      });

      bgRect?.show();

      const fileName =
        indices.length > 1 ? `${baseName}-${index + 1}.${kind}` : `${baseName}.${kind}`;

      if (IS_DESKTOP) {
        rendered.push({ fileName, dataUrl });
        continue;
      }

      const link = document.createElement("a");
      link.download = fileName;
      link.href = dataUrl;
      link.click();

      // Browsers throttle or drop bursts of programmatic downloads; a short
      // gap between them is what makes a 10-page export actually deliver 10
      // files.
      if (indices.length > 1) await new Promise((r) => setTimeout(r, 300));
    }

    if (IS_DESKTOP) {
      let saved = 0;
      try {
        saved = await saveImagesToDisk(rendered);
      } catch {
        toast.error("Couldn't save the export");
        return;
      }
      // Zero means the user dismissed the dialog — leave the modal open rather
      // than reporting an export that did not happen.
      if (saved === 0) return;
      onClose();
      toast.success(saved > 1 ? `Exported ${saved} pages` : `Exported ${rendered[0].fileName}`);
      return;
    }

    onClose();
    toast.success(
      indices.length > 1 ? `Exported ${indices.length} pages` : `Exported ${baseName}.${kind}`
    );
  }, [
    stageRef,
    zoom,
    format,
    projectName,
    kind,
    quality,
    transparentBg,
    onClose,
    allPages,
    multiPage,
    activeIndex,
  ]);

  const exportProjectFile = useCallback(() => {
    const s = useEditorStore.getState();
    // The project file is always the whole document — scope only applies to
    // the flattened image formats.
    const document_ = { name: s.projectName, format: s.format, pages: s.pages };

    if (IS_DESKTOP) {
      void (async () => {
        try {
          if (!(await saveProjectToDisk(document_))) return; // dialog dismissed
          onClose();
          toast.success("Project file saved");
        } catch {
          toast.error("Couldn't save the project file");
        }
      })();
      return;
    }

    downloadProjectFile(document_);
    onClose();
    toast.success("Project file downloaded");
  }, [onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Export ${projectName || "design"}`}
      subtitle={`${format.width} × ${format.height} · ${format.label}${
        multiPage ? ` · ${pages.length} pages` : ""
      }`}
      width="max-w-[412px]"
      footer={
        <>
          <span className="text-[11.5px] text-text-tertiary font-mono tabular-nums">
            {estimate ? `~${estimate} estimated` : `.${FILE_EXTENSION} project file`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-[11.5px] font-medium text-text-secondary hover:text-text-primary bg-surface-2 border border-border-default hover:bg-surface-4 px-3 py-1.5 rounded-md transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              Cancel
            </button>
            <button
              onClick={kind === "json" ? exportProjectFile : exportImage}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-accent-fg text-[11.5px] font-semibold px-3.5 py-1.5 rounded-md transition-colors duration-150 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <DownloadIcon className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => {
            const selected = kind === k.id;
            return (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                aria-pressed={selected}
                className={cx(
                  "text-left px-3 py-[11px] rounded-[10px] border transition-colors duration-150 ease-standard",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  selected
                    ? "border-[1.5px] border-accent bg-accent-tint"
                    : "border-border-default hover:bg-surface-4"
                )}
              >
                <span
                  className={cx(
                    "block text-[13px] font-semibold",
                    selected ? "text-accent-tint-fg" : "text-text-primary"
                  )}
                >
                  {k.label}
                </span>
                <span className="block text-[11px] text-text-tertiary mt-0.5">{k.hint}</span>
              </button>
            );
          })}
        </div>

        {multiPage && kind !== "json" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-ghost">
              Pages
            </span>
            <div className="flex bg-surface-4 rounded-md p-[3px] gap-[2px]">
              {[
                { id: false, label: `Current (page ${activeIndex + 1})` },
                { id: true, label: `All ${pages.length}` },
              ].map((opt) => (
                <button
                  key={String(opt.id)}
                  onClick={() => setAllPages(opt.id)}
                  aria-pressed={allPages === opt.id}
                  className={cx(
                    "flex-1 text-[11.5px] py-1 rounded-sm transition-colors duration-150 ease-standard",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    allPages === opt.id
                      ? "bg-surface-1 text-text-primary font-medium shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {kind === "jpeg" && (
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-text-ghost">
              Quality — <span className="font-mono tabular-nums">{quality}%</span>
            </span>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-accent h-1"
            />
          </label>
        )}

        {kind === "png" && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
              className="accent-accent w-3.5 h-3.5 rounded-sm"
            />
            <span className="text-[11.5px] text-text-secondary">Transparent background</span>
          </label>
        )}

        {kind === "json" && (
          <p className="text-[11.5px] text-text-tertiary leading-relaxed">
            Downloads the editable project — every page, with its layers, fonts and
            colours — so you can re-import it here later.
          </p>
        )}
      </div>
    </Modal>
  );
}
