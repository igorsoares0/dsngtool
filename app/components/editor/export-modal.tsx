"use client";

import { useCallback, useMemo, useState } from "react";
import type Konva from "konva";
import { useEditorStore } from "../../store/editor-store";
import { toast } from "../../store/toast-store";
import { downloadProjectFile, FILE_EXTENSION } from "../../lib/project-io";
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

  const [kind, setKind] = useState<ExportKind>("png");
  const [quality, setQuality] = useState(90);
  const [transparentBg, setTransparentBg] = useState(false);

  const estimate = useMemo(() => {
    if (kind === "json") return null;
    const px = format.width * format.height;
    const scale = kind === "jpeg" ? quality / 90 : 1;
    return formatBytes(px * BYTES_PER_PX[kind] * scale);
  }, [kind, format.width, format.height, quality]);

  // Moved verbatim from the old topbar dropdown: the offset/pixelRatio maths
  // depends on the stage being rendered at `zoom`, and hiding the background
  // Rect is what actually makes a transparent PNG transparent.
  const exportImage = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;

    const scale = zoom / 100;
    const containerWidth = stage.width();
    const containerHeight = stage.height();
    const offsetX = (containerWidth - format.width * scale) / 2;
    const offsetY = (containerHeight - format.height * scale) / 2;

    const bgLayer = stage.getLayers()[0];
    const bgRect = bgLayer?.findOne("Rect");
    const wantsTransparent = kind === "png" && transparentBg;
    if (wantsTransparent && bgRect) bgRect.hide();

    const mimeType = kind === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = stage.toDataURL({
      x: offsetX,
      y: offsetY,
      width: format.width * scale,
      height: format.height * scale,
      pixelRatio: format.width / (format.width * scale),
      mimeType,
      quality: kind === "jpeg" ? quality / 100 : undefined,
    });

    if (wantsTransparent && bgRect) bgRect.show();

    const link = document.createElement("a");
    const fileName = `${projectName || "design"}.${kind}`;
    link.download = fileName;
    link.href = dataUrl;
    link.click();
    onClose();
    toast.success(`Exported ${fileName}`);
  }, [stageRef, zoom, format, projectName, kind, quality, transparentBg, onClose]);

  const exportProjectFile = useCallback(() => {
    const s = useEditorStore.getState();
    downloadProjectFile({
      name: s.projectName,
      format: s.format,
      backgroundColor: s.backgroundColor,
      backgroundGradient: s.backgroundGradient,
      elements: s.elements,
    });
    onClose();
    toast.success("Project file downloaded");
  }, [onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Export ${projectName || "design"}`}
      subtitle={`${format.width} × ${format.height} · ${format.label}`}
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
            Downloads the editable project — layers, fonts and colours — so you can
            re-import it here later.
          </p>
        )}
      </div>
    </Modal>
  );
}
