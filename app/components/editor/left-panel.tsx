"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { useEditorStore } from "../../store/editor-store";
import { useEntitlementStore } from "../../store/entitlement-store";
import { TEMPLATES, type Template } from "../../data/templates";
import { templatePage } from "../../data/template-pages";
import { ASSETS } from "../../data/assets";
import { resolveFontFamily } from "../../lib/fonts";
import { addTextPreset } from "../../lib/text-presets";
import { CANVAS_FORMATS, type GradientFill, type Page, type ShapeElement } from "../../types/editor";
import DesignThumbnail from "../design-thumbnail";
import { LockIcon, UploadIcon, SearchIcon } from "./icons";
import { SegmentBars, formatBytes, storageLevel } from "./storage-meter";
import { cx } from "../ui/cx";
import SectionLabel from "../ui/section-label";
import { toast } from "../../store/toast-store";

type PanelType =
  | "templates"
  | "uploads"
  | "text"
  | "shapes"
  | "assets"
  | "overlays";

/* ---------------------------------------------------------------------------
   Shared panel parts
--------------------------------------------------------------------------- */

/** "Templates" 21/800 expanded, with a mono meta readout on the right. */
function PanelHeader({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 pt-4 pb-3">
      <h3 className="text-[21px] font-extrabold font-expanded tracking-[-0.01em] text-text-primary leading-none">
        {title}
      </h3>
      {meta !== undefined && (
        <span className="font-mono text-[10.5px] uppercase text-text-tertiary whitespace-nowrap">{meta}</span>
      )}
    </div>
  );
}

/** Underline search with a "/" hint; "/" anywhere outside a field focuses it. */
function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey) return;
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label className="mx-4 flex items-center gap-2 border-b border-border-strong py-1.5 focus-within:border-selection">
      <SearchIcon className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 min-w-0 bg-transparent text-[13px] text-text-primary placeholder:text-text-tertiary outline-none"
      />
      <kbd className="font-mono text-[10.5px] text-text-tertiary">/</kbd>
    </label>
  );
}

/** Text tabs; the active one gets a 2px accent underline, offset 4px. */
function TextTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-3.5 px-4 pt-3 pb-2.5 text-[12.5px]" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
            value === t.value
              ? "font-bold text-text-primary underline decoration-2 underline-offset-4 decoration-accent"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 mt-[18px] px-3 py-2.5 border-l-[3px] border-text-primary bg-surface-3 text-[12px] leading-[1.45] text-text-secondary">
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-2.5">
      <span className="text-[12px] text-text-secondary">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="modo-range flex-1"
        style={{ "--fill": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      />
      <span className="font-mono text-[11px] font-medium tabular-nums text-text-primary w-9 text-right">
        {Math.round(value)}
        {suffix}
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------------------
   Templates
--------------------------------------------------------------------------- */

type FormatTab = "all" | "post" | "story" | "pinterest";

const FORMAT_TABS: { value: FormatTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "post", label: "Post" },
  { value: "story", label: "Story" },
  { value: "pinterest", label: "Pinterest" },
];

function formatTabOf(t: Template): FormatTab {
  const i = CANVAS_FORMATS.findIndex((f) => f.width === t.format.width && f.height === t.format.height);
  return i === 1 ? "story" : i === 2 ? "pinterest" : "post";
}

function ratioLabel(w: number, h: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

/** The last template applied, per project — drives the selection ring. */
const useLastTemplate = create<{ projectId: string | null; name: string | null }>(() => ({
  projectId: null,
  name: null,
}));

function TemplatesPanel() {
  const loadTemplate = useEditorStore((s) => s.loadTemplate);
  const projectId = useEditorStore((s) => s.projectId);
  const isPro = useEntitlementStore((s) => s.pro);
  const openLicense = useEntitlementStore((s) => s.openModal);
  const last = useLastTemplate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FormatTab>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter(
      (t) =>
        (tab === "all" || formatTabOf(t) === tab) &&
        (q === "" || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    );
  }, [query, tab]);

  const selected = last.projectId === projectId ? last.name : null;

  return (
    <>
      <PanelHeader title="Templates" meta={TEMPLATES.length} />
      <SearchInput value={query} onChange={setQuery} placeholder="Search by name or mood" />
      <TextTabs tabs={FORMAT_TABS} value={tab} onChange={setTab} />

      {visible.length === 0 && (
        <p className="font-mono text-[10.5px] uppercase text-text-tertiary py-6 text-center">
          No templates match “{query}”
        </p>
      )}

      <div className="px-4 pt-0.5 pb-4 grid grid-cols-3 gap-x-2 gap-y-3 items-start">
        {visible.map((t) => {
          const locked = t.premium && !isPro;
          const isSelected = selected === t.name;
          return (
            <button
              key={t.name}
              onClick={() => {
                if (locked) {
                  openLicense(`"${t.name}" is a premium template. Upgrade to unlock it and all others.`);
                  return;
                }
                loadTemplate(t);
                useLastTemplate.setState({ projectId, name: t.name });
              }}
              aria-label={locked ? `${t.name} (premium template — upgrade to unlock)` : `Apply template ${t.name}`}
              className="group flex flex-col gap-[5px] text-left focus-visible:outline-none"
            >
              <span
                className={cx(
                  "relative block w-full overflow-hidden transition-shadow",
                  isSelected
                    ? "shadow-[0_0_0_2px_var(--selection)]"
                    : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.07)] group-hover:shadow-[0_0_0_1px_var(--text-primary)] group-focus-visible:shadow-[0_0_0_2px_var(--selection)]"
                )}
                style={{ aspectRatio: `${t.format.width} / ${t.format.height}`, backgroundColor: t.previewColor }}
              >
                <DesignThumbnail pages={[templatePage(t)]} format={t.format} className="absolute inset-0" />
                {locked && (
                  <span className="absolute top-1 right-1 flex items-center justify-center w-[18px] h-[18px] bg-surface-inverse text-text-inverse">
                    <LockIcon className="w-2.5 h-2.5" />
                  </span>
                )}
              </span>
              <span className="flex justify-between gap-1 min-w-0">
                <span className="text-[11px] font-semibold text-text-primary truncate">{t.name}</span>
                <span className="font-mono text-[10.5px] text-text-tertiary shrink-0">
                  {ratioLabel(t.format.width, t.format.height)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Uploads
--------------------------------------------------------------------------- */

/** Read an image file's natural pixel dimensions in the browser. */
function imageDimensions(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode_failed"));
    };
    img.src = url;
  });
}

const MAX_UPLOAD_MB = 15;

interface UploadItem {
  id: string;
  name: string;
  file: File;
  /** 0–100 while uploading. */
  progress: number;
  status: "uploading" | "done" | "failed";
  error?: string;
  url?: string;
  w?: number;
  h?: number;
}

/** This session's uploads. There is no list endpoint for older ones, so the
 *  grid shows only what was uploaded since the editor opened. */
const useSessionUploads = create<{ items: UploadItem[] }>(() => ({ items: [] }));

function patchUpload(id: string, patch: Partial<UploadItem>) {
  useSessionUploads.setState((s) => ({
    items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  }));
}

const UPLOAD_ERRORS: Record<string, string> = {
  quota_exceeded: "STORAGE FULL",
  file_too_large: `OVER ${MAX_UPLOAD_MB} MB`,
  unsupported_type: "UNSUPPORTED TYPE",
  unauthorized: "SIGN IN TO UPLOAD",
  network: "NETWORK ERROR",
};

function placeImage(url: string, natW: number, natH: number) {
  const { addElement, format } = useEditorStore.getState();
  const maxW = format.width * 0.6;
  const w = Math.min(natW, maxW);
  const h = w * (natH / natW);
  addElement({
    type: "image",
    src: url,
    x: (format.width - w) / 2,
    y: (format.height - h) / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
  });
}

/** POST via XHR — fetch() exposes no upload progress. */
function sendUpload(form: FormData, onProgress: (pct: number) => void) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/uploads");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON error page
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(form);
  });
}

async function runUpload(id: string) {
  const item = useSessionUploads.getState().items.find((i) => i.id === id);
  if (!item) return;
  patchUpload(id, { status: "uploading", progress: 0, error: undefined });

  if (item.file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    patchUpload(id, { status: "failed", error: "file_too_large" });
    return;
  }

  // Measure natural dimensions locally, then upload the bytes to R2 via our
  // API (which enforces the storage quota) and place the returned URL.
  const dims = await imageDimensions(item.file).catch(() => null);
  const form = new FormData();
  form.append("file", item.file);
  if (dims) {
    form.append("width", String(dims.w));
    form.append("height", String(dims.h));
  }

  let res: { status: number; body: Record<string, unknown> };
  try {
    res = await sendUpload(form, (progress) => patchUpload(id, { progress }));
  } catch {
    patchUpload(id, { status: "failed", error: "network" });
    return;
  }

  if (res.status < 200 || res.status >= 300) {
    const code = res.status === 401 ? "unauthorized" : String(res.body.error ?? "upload_failed");
    patchUpload(id, { status: "failed", error: code });
    if (code === "quota_exceeded") toast.warning("Storage full — free up space or upgrade for more.");
    return;
  }

  const { url, width, height } = res.body as { url: string; width: number | null; height: number | null };
  const format = useEditorStore.getState().format;
  const natW = width ?? dims?.w ?? format.width * 0.6;
  const natH = height ?? dims?.h ?? natW;
  patchUpload(id, { status: "done", progress: 100, url, w: natW, h: natH });
  placeImage(url, natW, natH);
  // The quota just moved — keep the meter honest.
  useEntitlementStore.getState().refresh();
}

function startUploads(files: FileList | File[]) {
  const added: UploadItem[] = [...files].map((file, i) => ({
    id: `up_${Date.now()}_${i}`,
    name: file.name,
    file,
    progress: 0,
    status: "uploading",
  }));
  useSessionUploads.setState((s) => ({ items: [...added, ...s.items] }));
  for (const it of added) void runUpload(it.id);
}

function UploadsPanel() {
  const storage = useEntitlementStore((s) => s.storage);
  const items = useSessionUploads((s) => s.items);
  const [dragging, setDragging] = useState(false);

  const meter = storage && storage.limit > 0 ? storageLevel(storage) : null;

  return (
    <>
      <PanelHeader
        title="Uploads"
        meta={items.length > 0 ? `${items.length} ${items.length === 1 ? "FILE" : "FILES"} THIS SESSION` : undefined}
      />

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) startUploads(e.dataTransfer.files);
        }}
        className={cx(
          "mx-4 h-[120px] border-[1.5px] border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors duration-150 ease-standard",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-selection",
          dragging ? "border-selection bg-selection-tint" : "border-text-tertiary bg-surface-0 hover:bg-surface-3"
        )}
      >
        <UploadIcon className="w-[18px] h-[18px] text-text-primary" />
        <span className="text-[13.5px] font-semibold text-text-primary">
          Drop files or{" "}
          <span className="underline decoration-2 underline-offset-[3px] decoration-accent">browse</span>
        </span>
        <span className="font-mono text-[10.5px] text-text-tertiary">
          PNG · JPG · WEBP · UP TO {MAX_UPLOAD_MB} MB
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) startUploads(e.target.files);
            // Reset so picking the same file again re-fires onChange.
            e.target.value = "";
          }}
        />
      </label>

      {storage && meter && (
        <div className="mx-4 mt-3 flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] text-text-tertiary">STORAGE</span>
          <SegmentBars
            count={16}
            filled={Math.round((meter.pct / 100) * 16)}
            onClass={meter.level === "full" ? "bg-danger" : meter.level === "warn" ? "bg-warning" : "bg-text-primary"}
            barClassName="flex-1 h-1"
            className="flex-1"
          />
          <span
            className={cx(
              "font-mono text-[10.5px] font-medium tabular-nums",
              meter.level === "full" ? "text-danger" : meter.level === "warn" ? "text-warning" : "text-text-primary"
            )}
          >
            {Math.round(storage.used / (1024 * 1024))}/{formatBytes(storage.limit)}
          </span>
        </div>
      )}

      {items.length > 0 && (
        <div className="px-4 pt-4 pb-4 grid grid-cols-2 gap-2.5">
          {items.map((it) => (
            <UploadTile key={it.id} item={it} />
          ))}
        </div>
      )}
    </>
  );
}

function UploadTile({ item }: { item: UploadItem }) {
  const failed = item.status === "failed";
  const uploading = item.status === "uploading";
  const meta = failed ? "FAILED" : uploading ? `${item.progress}%` : item.w && item.h ? ratioLabel(Math.round(item.w), Math.round(item.h)) : "";
  return (
    <div className="flex flex-col gap-[5px] min-w-0">
      <button
        type="button"
        disabled={uploading}
        onClick={() => {
          if (failed) void runUpload(item.id);
          else if (item.url && item.w && item.h) placeImage(item.url, item.w, item.h);
        }}
        title={failed ? "Retry" : item.status === "done" ? "Add to page" : undefined}
        className={cx(
          "relative aspect-square flex items-center justify-center p-2 text-center font-mono text-[10.5px] font-medium overflow-hidden",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
          failed
            ? "bg-danger-tint text-danger shadow-[inset_0_0_0_1px_var(--danger)]"
            : uploading
              ? "bg-surface-3 text-text-tertiary shadow-[inset_0_-3px_0_var(--text-primary),inset_0_0_0_1px_var(--border-default)]"
              : "bg-surface-3 shadow-[inset_0_0_0_1px_var(--border-default)] hover:shadow-[0_0_0_2px_var(--selection)]"
        )}
      >
        {item.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="w-full h-full object-contain" loading="lazy" />
        ) : failed ? (
          <span>
            {UPLOAD_ERRORS[item.error ?? ""] ?? "UPLOAD FAILED"} · RETRY
          </span>
        ) : (
          <span>UPLOADING…</span>
        )}
        {uploading && (
          <span
            aria-hidden
            className="absolute left-0 bottom-0 h-[3px] bg-text-primary transition-[width]"
            style={{ width: `${item.progress}%` }}
          />
        )}
      </button>
      <span className="flex justify-between gap-1.5 font-mono text-[10.5px] min-w-0">
        <span className="truncate text-text-primary">{item.name}</span>
        <span className={cx("shrink-0", failed ? "text-danger" : uploading ? "text-text-primary" : "text-text-tertiary")}>
          {meta}
        </span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Text
--------------------------------------------------------------------------- */

const PAIRINGS: {
  name: string;
  bg: string;
  fg: string;
  sub?: string;
  head: { family: string; text: string; size: number; style?: React.CSSProperties };
  body: { family: string; text: string; size: number; style?: React.CSSProperties };
}[] = [
  {
    name: "Sonder",
    bg: "#F1ECE2",
    fg: "#2B2B2B",
    head: { family: "Playfair Display", text: "Sonder", size: 24 },
    body: { family: "Libre Baskerville", text: "a quiet definition", size: 10.5, style: { fontStyle: "italic" } },
  },
  {
    name: "Big Sale",
    bg: "#0F0F0F",
    fg: "#FFD600",
    sub: "#FFFFFF",
    head: { family: "Bebas Neue", text: "BIG SALE", size: 34, style: { lineHeight: 0.9 } },
    body: { family: "DM Sans", text: "50% off this weekend", size: 10.5 },
  },
  {
    name: "Botanica",
    bg: "#2D3A2D",
    fg: "#E8DFD0",
    head: { family: "Caveat", text: "botanica", size: 30 },
    body: { family: "Montserrat", text: "PLANT SHOP", size: 10, style: { letterSpacing: "0.2em" } },
  },
  {
    name: "Sunday Bread",
    bg: "#FBF7F0",
    fg: "#B45309",
    head: { family: "Libre Baskerville", text: "Sunday Bread", size: 19 },
    body: { family: "DM Sans", text: "RECIPE · 45 MIN", size: 10.5, style: { fontWeight: 600 } },
  },
];

function TextPanel() {
  const pages = useEditorStore((s) => s.pages);
  const format = useEditorStore((s) => s.format);

  const fontsInUse = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pages)
      for (const el of p.elements)
        if (el.type === "text") counts.set(el.fontFamily, (counts.get(el.fontFamily) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [pages]);

  const rows: { preset: "heading" | "subheading" | "body"; label: string; key: string; cls: string }[] = [
    { preset: "heading", label: "Add a heading", key: "T", cls: "h-14 text-[21px] font-black font-expanded tracking-[-0.01em]" },
    { preset: "subheading", label: "Add a subheading", key: "⇧T", cls: "h-11 text-[16px] font-semibold" },
    { preset: "body", label: "Add body text", key: "⌥T", cls: "h-[38px] text-[13px]" },
  ];

  return (
    <>
      <PanelHeader title="Text" />
      <div className="px-4 flex flex-col gap-1.5">
        {rows.map((r) => (
          <button
            key={r.preset}
            onClick={() => addTextPreset(r.preset)}
            className={cx(
              "flex items-center justify-between gap-2 px-3.5 border border-border-default bg-surface-0 text-text-primary text-left hover:bg-surface-3 transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
              r.cls
            )}
          >
            <span className="truncate min-w-0">{r.label}</span>
            <kbd className="font-mono text-[10.5px] font-normal text-text-tertiary tracking-normal">{r.key}</kbd>
          </button>
        ))}
      </div>

      <div className="px-4 pt-5 pb-2.5">
        <SectionLabel code="A">Font pairings</SectionLabel>
      </div>
      <div className="px-4 grid grid-cols-2 gap-2">
        {PAIRINGS.map((p) => (
          <button
            key={p.name}
            onClick={() => {
              const mid = format.height / 2;
              addTextPreset("heading", { text: p.head.text, fontFamily: p.head.family, fontStyle: "normal", y: mid - 90 });
              addTextPreset("body", { text: p.body.text, fontFamily: p.body.family, fontStyle: "normal", y: mid + 10 });
            }}
            title={`${p.head.family} + ${p.body.family}`}
            className="h-24 flex flex-col justify-center gap-0.5 p-3 text-left overflow-hidden shadow-[inset_0_0_0_1px_rgb(0_0_0/0.07)] hover:shadow-[0_0_0_2px_var(--selection)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
            style={{ backgroundColor: p.bg, color: p.fg }}
          >
            <span
              className="leading-none truncate"
              style={{ fontFamily: resolveFontFamily(p.head.family), fontSize: p.head.size, ...p.head.style }}
            >
              {p.head.text}
            </span>
            <span
              className="truncate"
              style={{ fontFamily: resolveFontFamily(p.body.family), fontSize: p.body.size, color: p.sub, ...p.body.style }}
            >
              {p.body.text}
            </span>
          </button>
        ))}
      </div>

      <div className="px-4 pt-5 pb-2">
        <SectionLabel code="B">Fonts in this design</SectionLabel>
      </div>
      {fontsInUse.length === 0 ? (
        <p className="px-4 pb-4 font-mono text-[10.5px] uppercase text-text-tertiary">No text layers yet</p>
      ) : (
        <div className="flex flex-col pb-4">
          {fontsInUse.map(([family, count], i) => (
            <div
              key={family}
              className={cx(
                "flex items-center justify-between gap-2 h-10 px-4 border-t border-border-default",
                i === fontsInUse.length - 1 && "border-b"
              )}
            >
              <span className="truncate text-[15px] text-text-primary" style={{ fontFamily: resolveFontFamily(family) }}>
                {family}
              </span>
              <span className="font-mono text-[10.5px] text-text-tertiary shrink-0">
                {count} {count === 1 ? "LAYER" : "LAYERS"}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Shapes
--------------------------------------------------------------------------- */

type ShapeKind = "rectangle" | "ellipse" | "triangle" | "pill" | "line";

function addShape(kind: ShapeKind) {
  const { addElement, format } = useEditorStore.getState();
  if (kind === "line") {
    const length = Math.min(format.width, format.height) * 0.4;
    const thickness = 4;
    addElement({
      type: "shape",
      shapeType: "line",
      fill: "#161513",
      stroke: "#161513",
      strokeWidth: thickness,
      x: (format.width - length) / 2,
      y: (format.height - thickness) / 2,
      width: length,
      height: thickness,
      rotation: 0,
      opacity: 1,
    });
    return;
  }
  const size = Math.min(format.width, format.height) * 0.25;
  const w = kind === "pill" ? size * 1.6 : size;
  const h = size;
  addElement({
    type: "shape",
    shapeType: kind === "pill" ? "rectangle" : kind,
    fill: "#161513",
    cornerRadius: kind === "pill" ? h / 2 : undefined,
    x: (format.width - w) / 2,
    y: (format.height - h) / 2,
    width: w,
    height: h,
    rotation: 0,
    opacity: 1,
  });
}

function ShapeTile({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Add ${label}`}
      title={`Add ${label}`}
      className={cx(
        "bg-surface-0 border border-border-default flex items-center justify-center hover:bg-surface-3 hover:border-text-primary transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
        className
      )}
    >
      {children}
    </button>
  );
}

function ShapesPanel() {
  return (
    <>
      <PanelHeader title="Shapes" meta="CLICK TO ADD" />
      <div className="px-4 pt-1.5 pb-2.5">
        <SectionLabel code="A">Basic</SectionLabel>
      </div>
      <div className="px-4 grid grid-cols-3 gap-1.5">
        <ShapeTile label="rectangle" onClick={() => addShape("rectangle")} className="aspect-square">
          <span className="w-[42px] h-[42px] bg-text-primary" />
        </ShapeTile>
        <ShapeTile label="ellipse" onClick={() => addShape("ellipse")} className="aspect-square">
          <span className="w-11 h-11 rounded-full bg-text-primary" />
        </ShapeTile>
        <ShapeTile label="triangle" onClick={() => addShape("triangle")} className="aspect-square">
          <span className="w-[46px] h-10 bg-text-primary [clip-path:polygon(50%_0,100%_100%,0_100%)]" />
        </ShapeTile>
        <ShapeTile label="pill" onClick={() => addShape("pill")} className="aspect-square">
          <span className="w-12 h-[30px] rounded-full bg-text-primary" />
        </ShapeTile>
      </div>

      <div className="px-4 pt-[18px] pb-2.5">
        <SectionLabel code="B">Lines</SectionLabel>
      </div>
      <div className="px-4 grid grid-cols-3 gap-1.5">
        <ShapeTile label="line" onClick={() => addShape("line")} className="h-[52px]">
          <span className="w-[50px] h-0.5 bg-text-primary" />
        </ShapeTile>
      </div>

      <Tip>
        Tip: hold <kbd className="font-mono text-[11px] font-medium text-text-primary">⇧</kbd> while resizing to keep proportions.
      </Tip>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Assets
--------------------------------------------------------------------------- */

function AssetsPanel() {
  const addElement = useEditorStore((s) => s.addElement);
  const format = useEditorStore((s) => s.format);

  const addAsset = (src: string) => {
    const img = new window.Image();
    img.onload = () => {
      const maxW = format.width * 0.6;
      const ratio = img.width / img.height;
      const w = Math.min(img.width, maxW);
      const h = w / ratio;
      addElement({
        type: "image",
        src,
        x: (format.width - w) / 2,
        y: (format.height - h) / 2,
        width: w,
        height: h,
        rotation: 0,
        opacity: 1,
      });
    };
    img.src = src;
  };

  return (
    <>
      <PanelHeader title="Assets" meta={ASSETS.length} />
      <div className="px-4 pb-4 grid grid-cols-4 gap-1">
        {ASSETS.map((asset) => (
          <button
            key={asset.id}
            onClick={() => addAsset(asset.src)}
            aria-label="Add asset"
            title="Add to page"
            className="aspect-square bg-surface-0 shadow-[inset_0_0_0_1px_var(--border-default)] flex items-center justify-center hover:shadow-[inset_0_0_0_1.5px_var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.src} alt="" className="w-full h-full object-contain p-1.5" loading="lazy" />
          </button>
        ))}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
   Overlays
--------------------------------------------------------------------------- */

type OverlayElement = Omit<ShapeElement, "id">;

interface OverlayPreset {
  label: string;
  /** CSS for the preview swatch laid over the page thumbnail. */
  preview: string;
  /** Opacity at 100% intensity is the element's opacity; previews use it too. */
  opacity: number;
  fill: string;
  gradient?: GradientFill;
}

const OVERLAY_PRESETS: OverlayPreset[] = [
  {
    label: "Warm wash",
    preview: "linear-gradient(160deg,rgb(255 140 60),rgb(255 210 120))",
    opacity: 0.35,
    fill: "#FF8C3C",
    gradient: { type: "linear", startX: 0, startY: 0, endX: 0.35, endY: 1, colorStops: [0, "#FF8C3C", 1, "#FFD278"] },
  },
  {
    label: "Vignette",
    preview: "radial-gradient(circle,transparent 40%,rgb(0 0 0 / .85) 100%)",
    opacity: 1,
    fill: "#000000",
    gradient: {
      type: "radial",
      startX: 0.5, startY: 0.5, endX: 0.5, endY: 0.5,
      startRadius: 0.3, endRadius: 0.75,
      colorStops: [0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0.85)"],
    },
  },
  {
    label: "Light leak",
    preview: "radial-gradient(circle at 20% 30%,#FBBF24 0%,rgb(249 115 22 / .5) 45%,transparent 75%)",
    opacity: 0.7,
    fill: "#F97316",
    gradient: {
      type: "radial",
      startX: 0.2, startY: 0.3, endX: 0.2, endY: 0.3,
      startRadius: 0, endRadius: 0.9,
      colorStops: [0, "#FBBF24", 0.5, "rgba(249,115,22,0.5)", 1, "rgba(249,115,22,0)"],
    },
  },
  {
    label: "Shade",
    preview: "linear-gradient(180deg,transparent 35%,rgb(22 21 19 / .9) 100%)",
    opacity: 0.9,
    fill: "#161513",
    gradient: {
      type: "linear",
      startX: 0, startY: 0.35, endX: 0, endY: 1,
      colorStops: [0, "rgba(22,21,19,0)", 1, "rgba(22,21,19,1)"],
    },
  },
  { label: "Cobalt wash", preview: "rgb(47 75 255)", opacity: 0.4, fill: "#2F4BFF" },
  { label: "Paper tint", preview: "rgb(242 230 205)", opacity: 0.35, fill: "#F2E6CD" },
];

function buildOverlay(p: OverlayPreset, canvas: { width: number; height: number }, opacity = p.opacity): OverlayElement {
  return {
    type: "shape",
    shapeType: "rectangle",
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    rotation: 0,
    opacity,
    fill: p.fill,
    ...(p.gradient ? { gradient: p.gradient } : {}),
  };
}

/** An overlay is recognised from the data alone: a full-page rectangle whose
 *  fill and gradient match a preset. No tag is stored on the element. */
function matchOverlay(el: Page["elements"][number], format: { width: number; height: number }) {
  if (el.type !== "shape" || el.shapeType !== "rectangle") return null;
  if (el.x !== 0 || el.y !== 0 || el.width !== format.width || el.height !== format.height) return null;
  return (
    OVERLAY_PRESETS.find(
      (p) =>
        p.fill === el.fill &&
        JSON.stringify(p.gradient?.colorStops ?? null) === JSON.stringify(el.gradient?.colorStops ?? null)
    ) ?? null
  );
}

function OverlaysPanel() {
  const pages = useEditorStore((s) => s.pages);
  const activePageId = useEditorStore((s) => s.activePageId);
  const elements = useEditorStore((s) => s.elements);
  const format = useEditorStore((s) => s.format);
  const addElement = useEditorStore((s) => s.addElement);
  const removeElement = useEditorStore((s) => s.removeElement);
  const updateElement = useEditorStore((s) => s.updateElement);

  const pageIndex = Math.max(0, pages.findIndex((p) => p.id === activePageId));
  const page = pages[pageIndex];

  // The topmost recognised overlay on this page is "the" overlay.
  let active: { el: Page["elements"][number]; preset: OverlayPreset } | null = null;
  for (let i = elements.length - 1; i >= 0 && !active; i--) {
    const preset = matchOverlay(elements[i], format);
    if (preset) active = { el: elements[i], preset };
  }

  // The page without its overlay, for previews.
  const basePage: Page | null = page
    ? { ...page, elements: page.elements.filter((e) => e.id !== active?.el.id) }
    : null;

  const apply = (preset: OverlayPreset | null) => {
    if (active) removeElement(active.el.id);
    if (preset) addElement(buildOverlay(preset, format));
  };

  const intensity = active ? Math.round((active.el.opacity / active.preset.opacity) * 100) : 0;

  const tiles: (OverlayPreset | null)[] = [null, ...OVERLAY_PRESETS];

  return (
    <>
      <PanelHeader title="Overlays" meta={`ON PAGE ${pageIndex + 1}`} />
      <p className="px-4 pb-3 -mt-2 text-[12px] text-text-secondary">Tone laid over the whole page.</p>
      <div className="px-4 grid grid-cols-2 gap-2.5">
        {tiles.map((p) => {
          const on = p ? active?.preset === p : !active;
          return (
            <button
              key={p?.label ?? "none"}
              onClick={() => apply(p)}
              aria-pressed={on}
              className="flex flex-col gap-[5px] text-left group focus-visible:outline-none"
            >
              <span
                className={cx(
                  "relative block w-full overflow-hidden",
                  on
                    ? "shadow-[0_0_0_2px_var(--selection)]"
                    : "shadow-[inset_0_0_0_1px_var(--border-default)] group-hover:shadow-[0_0_0_1px_var(--text-primary)] group-focus-visible:shadow-[0_0_0_2px_var(--selection)]"
                )}
                style={{ aspectRatio: `${format.width} / ${format.height}` }}
              >
                {basePage && <DesignThumbnail pages={[basePage]} format={format} className="absolute inset-0" />}
                {p && (
                  <span
                    className="absolute inset-0"
                    style={{ background: p.preview, opacity: p.opacity }}
                  />
                )}
              </span>
              <span className="flex justify-between">
                <span className={cx("text-[12px] text-text-primary", on ? "font-bold" : "font-medium")}>
                  {p?.label ?? "None"}
                </span>
                {on && p && <span className="font-mono text-[10.5px] text-accent">ON</span>}
              </span>
            </button>
          );
        })}
      </div>
      {active && (
        <div className="mx-4 mt-4 mb-4 pt-3 border-t border-border-default">
          <Slider
            label="Intensity"
            value={intensity}
            min={5}
            max={100}
            onChange={(v) => updateElement(active.el.id, { opacity: (v / 100) * active.preset.opacity })}
          />
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
   Shell
--------------------------------------------------------------------------- */

const PANELS: Record<PanelType, () => React.JSX.Element> = {
  templates: TemplatesPanel,
  uploads: UploadsPanel,
  text: TextPanel,
  shapes: ShapesPanel,
  assets: AssetsPanel,
  overlays: OverlaysPanel,
};

export default function LeftPanel({
  activePanel,
  onClose,
}: {
  activePanel: PanelType | null;
  onClose: () => void;
}) {
  if (!activePanel) return null;

  const PanelContent = PANELS[activePanel];

  return (
    <>
      {/* Below xl the panel floats over the canvas, so it needs a way out. */}
      <div className="absolute inset-0 z-20 xl:hidden" onClick={onClose} aria-hidden />
      <div
        // Re-keyed so switching tools replays the 150ms fade.
        key={activePanel}
        className={cx(
          "w-[288px] bg-surface-1 border-r border-border-default overflow-y-auto shrink-0 animate-panel-in",
          // Docked at xl and up; an overlay below it. `left-[68px]` clears the
          // rail. Docked panels get a border and no shadow; only the floating
          // form is raised.
          "absolute inset-y-0 left-[68px] z-30 shadow-pop xl:static xl:left-auto xl:z-auto xl:shadow-none"
        )}
      >
        <PanelContent />
      </div>
    </>
  );
}
