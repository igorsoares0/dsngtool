"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import DesignThumbnail from "../design-thumbnail";
import { normalizePages } from "../../lib/project-data";
import { formatProjectNumber } from "../../lib/project-number";
import { MoreIcon, SearchIcon } from "../editor/icons";
import { btnPrimary } from "../ui/buttons";
import { cx } from "../ui/cx";
import { BriefCard, FormatCard } from "./start-row";
import type { Me, ProjectRow } from "./types";

type View = "grid" | "list";
type Sort = "recent" | "name" | "created";

const SORT_LABEL: Record<Sort, string> = {
  recent: "RECENT ↓",
  name: "NAME A–Z",
  created: "CREATED ↓",
};
const NEXT_SORT: Record<Sort, Sort> = { recent: "name", name: "created", created: "recent" };

const VIEW_KEY = "modo-dashboard-view";

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

/** A project's format, as a tab label. Derived from the stored document. */
function formatLabel(p: ProjectRow): string {
  const f = p.data.format;
  if (!f) return "Other";
  if (f.label) return f.label;
  if (f.name) return f.name;
  if (f.width && f.height) return `${f.width}×${f.height}`;
  return "Other";
}

/** The document's canvas size, or null when the record predates it. */
function thumbnailFormat(p: ProjectRow) {
  const f = p.data.format;
  if (!f?.width || !f?.height) return null;
  return { label: f.label ?? "Custom", width: f.width, height: f.height };
}

/** Card width at the card's real ratio: squares 196px wide, portraits ~216px tall. */
function cardWidth(p: ProjectRow): number {
  const f = thumbnailFormat(p);
  if (!f) return 196;
  const r = f.width / f.height;
  return r >= 1 ? 196 : Math.round(216 * r);
}

// GRID | LIST is a per-viewer nicety kept in localStorage. Read through
// useSyncExternalStore so the server render (always "grid") and the first
// client render agree, and the stored choice applies right after hydration.
const viewListeners = new Set<() => void>();
function readView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}
function writeView(v: View) {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    // storage blocked — the choice just won't stick
  }
  viewListeners.forEach((l) => l());
}
function subscribeView(l: () => void) {
  viewListeners.add(l);
  return () => viewListeners.delete(l);
}

export default function ProjectsView({
  me,
  projects,
  numbers,
  loading,
  onDelete,
}: {
  me: Me | null;
  projects: ProjectRow[];
  numbers: Record<string, number>;
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState("All");
  const view = useSyncExternalStore(subscribeView, readView, () => "grid" as View);
  const [sort, setSort] = useState<Sort>("recent");
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const briefRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuFor]);

  // "/" search · N new design · ⌘K brief.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        briefRef.current?.focus();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        window.location.href = "/?new=1";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const setViewPersist = writeView;

  const formats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of projects) counts.set(formatLabel(p), (counts.get(formatLabel(p)) ?? 0) + 1);
    return [["All", projects.length] as const, ...[...counts.entries()].sort((a, b) => b[1] - a[1])];
  }, [projects]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = projects.filter(
      (p) =>
        (formatFilter === "All" || formatLabel(p) === formatFilter) &&
        (q === "" || p.name.toLowerCase().includes(q))
    );
    if (sort === "name") return [...rows].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "created") return [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return rows; // already newest-updated first
  }, [projects, query, formatFilter, sort]);

  const latestId = projects[0]?.id;
  const empty = !loading && projects.length === 0;

  return (
    <div className="flex flex-col pb-16">
      {/* Header */}
      <div className="px-5 sm:px-11 pt-[34px] grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] items-end gap-6">
        <h1 className="flex items-start gap-2.5">
          <span className="text-[56px] sm:text-[88px] leading-[0.82] font-black font-wide tracking-[-0.04em]">Projects</span>
          <span className="font-mono text-[14px] font-medium text-accent">
            {String(projects.length).padStart(2, "0")}
          </span>
        </h1>
        {!empty && (
          <div className="flex items-stretch gap-2 h-[42px]">
            <label className="flex items-center gap-2 w-full sm:w-[250px] px-3 border border-border-default bg-surface-1 focus-within:shadow-[inset_0_0_0_1.5px_var(--selection)]">
              <SearchIcon className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                aria-label="Search projects"
                className="flex-1 min-w-0 bg-transparent text-[13px] placeholder:text-text-tertiary outline-none"
              />
              <kbd className="font-mono text-[10.5px] text-text-tertiary">/</kbd>
            </label>
            <Link href="/?new=1" className={cx(btnPrimary, "px-[18px] text-[13px] shrink-0")}>
              + New design
            </Link>
          </div>
        )}
      </div>

      {empty ? (
        <div className="mx-5 sm:mx-11 mt-[26px] pt-[22px] border-t border-border-strong grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-stretch">
          <div className="flex flex-col gap-3.5">
            <p className="text-[26px] font-extrabold leading-[1.1] tracking-[-0.01em] max-w-[520px]" style={{ fontStretch: "112%" }}>
              Nothing here yet. Pick a format, or describe what you need.
            </p>
            <div className="flex gap-2.5 mt-1.5 flex-wrap">
              <FormatCard slug="post" compact />
              <FormatCard slug="story" compact />
              <FormatCard slug="pinterest" compact />
            </div>
          </div>
          <BriefCard ref={briefRef} ai={me?.ai ?? null} empty />
        </div>
      ) : (
        <>
          {/* Start row */}
          <div className="px-5 sm:px-11 pt-6 grid grid-cols-3 lg:grid-cols-[150px_120px_136px_minmax(0,1fr)] gap-3 items-stretch">
            <FormatCard slug="post" />
            <FormatCard slug="story" />
            <FormatCard slug="pinterest" />
            <div className="col-span-3 lg:col-span-1">
              <BriefCard ref={briefRef} ai={me?.ai ?? null} />
            </div>
          </div>

          {/* Filters */}
          <div className="mx-5 sm:mx-11 mt-[26px] pb-3 border-b border-border-default flex items-center gap-x-[26px] gap-y-2 flex-wrap text-[13px]">
            {formats.map(([f, n]) => (
              <button
                key={f}
                onClick={() => setFormatFilter(f)}
                aria-pressed={formatFilter === f}
                className={cx(
                  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-selection",
                  formatFilter === f
                    ? "font-bold underline decoration-2 underline-offset-[6px] decoration-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {f} <span className="font-mono text-[10.5px] font-normal">{n}</span>
              </button>
            ))}
            <span className="flex-1" />
            <div className="flex border border-border-default font-mono text-[10.5px] font-medium" role="group" aria-label="View">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewPersist(v)}
                  aria-pressed={view === v}
                  className={cx(
                    "px-2.5 py-[5px] uppercase focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-selection",
                    view === v ? "bg-surface-inverse text-text-inverse" : "text-text-tertiary hover:text-text-primary"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSort(NEXT_SORT[sort])}
              className="font-mono text-[10.5px] text-text-tertiary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-selection"
              title="Change sort"
            >
              {SORT_LABEL[sort]}
            </button>
          </div>

          {/* Projects */}
          {loading ? (
            <div className="px-5 sm:px-11 pt-5 flex gap-[22px] items-end flex-wrap" aria-busy>
              {[196, 120, 144, 196, 120, 144].map((w, i) => (
                <div key={i} className="flex flex-col gap-[7px]" style={{ width: w }}>
                  <div className="skeleton" style={{ aspectRatio: w === 196 ? "1" : w === 120 ? "9/16" : "2/3" }} />
                  <span className="skeleton h-2 w-[70%]" />
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="px-5 sm:px-11 py-10 font-mono text-[10.5px] uppercase text-text-tertiary">
              No projects match your filters
            </p>
          ) : view === "grid" ? (
            <div className="px-5 sm:px-11 pt-5 flex gap-x-[22px] gap-y-8 items-end flex-wrap">
              {visible.map((p) => {
                const fmt = thumbnailFormat(p);
                const pages = normalizePages(p.data);
                return (
                  <div key={p.id} className="group relative flex flex-col gap-[7px] shrink-0" style={{ width: cardWidth(p) }}>
                    <Link
                      href={`/?project=${p.id}`}
                      aria-label={`Open ${p.name}`}
                      className={cx(
                        "relative block overflow-hidden transition-shadow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-selection",
                        p.id === latestId
                          ? "shadow-[0_0_0_3px_var(--surface-0),0_0_0_5px_var(--accent)]"
                          : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.07)] group-hover:shadow-[0_0_0_1px_var(--text-primary)]"
                      )}
                      style={{ aspectRatio: fmt ? `${fmt.width} / ${fmt.height}` : "1" }}
                    >
                      {fmt ? (
                        <DesignThumbnail pages={pages} format={fmt} className="absolute inset-0" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-text-tertiary bg-surface-3">
                          {p.data.format?.width ?? "?"} × {p.data.format?.height ?? "?"}
                        </span>
                      )}
                      {pages.length > 1 && (
                        <span className="absolute bottom-1.5 right-1.5 font-mono text-[10.5px] px-1.5 py-0.5 bg-surface-inverse text-text-inverse">
                          {pages.length} PAGES
                        </span>
                      )}
                    </Link>
                    <ProjectMenu p={p} open={menuFor === p.id} onToggle={setMenuFor} onDelete={onDelete} />
                    <div className="flex gap-[7px] items-baseline border-t border-border-strong pt-1.5 min-w-0">
                      <span className="font-mono text-[10.5px] font-medium text-text-tertiary">
                        {formatProjectNumber(numbers[p.id])}
                      </span>
                      <span className="text-[12.5px] font-bold flex-1 truncate">{p.name}</span>
                      <span className="font-mono text-[10.5px] text-text-tertiary">{relativeDate(p.updatedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mx-5 sm:mx-11" role="table" aria-label="Projects">
              <div role="row" className="grid grid-cols-[48px_56px_minmax(0,1fr)_160px_72px_64px_32px] items-center gap-3 h-9 border-b border-border-strong font-mono text-[10.5px] text-text-tertiary">
                <span role="columnheader" />
                <span role="columnheader">Nº</span>
                <span role="columnheader">NAME</span>
                <span role="columnheader" className="hidden sm:block">FORMAT</span>
                <span role="columnheader" className="hidden sm:block">PAGES</span>
                <span role="columnheader">EDITED</span>
                <span role="columnheader" />
              </div>
              {visible.map((p) => {
                const fmt = thumbnailFormat(p);
                const pages = normalizePages(p.data);
                return (
                  <div
                    key={p.id}
                    role="row"
                    className="group relative grid grid-cols-[48px_56px_minmax(0,1fr)_160px_72px_64px_32px] items-center gap-3 h-14 border-b border-border-default hover:bg-surface-1"
                  >
                    <span className="w-10 h-10 flex items-center justify-center">
                      {fmt && (
                        <span
                          className="block overflow-hidden shadow-[inset_0_0_0_1px_rgb(0_0_0/0.07)]"
                          style={{
                            width: fmt.width >= fmt.height ? 40 : Math.round((40 * fmt.width) / fmt.height),
                            height: fmt.height >= fmt.width ? 40 : Math.round((40 * fmt.height) / fmt.width),
                          }}
                        >
                          <DesignThumbnail pages={pages} format={fmt} className="w-full h-full" />
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10.5px] font-medium text-text-tertiary">
                      {formatProjectNumber(numbers[p.id])}
                    </span>
                    <Link
                      href={`/?project=${p.id}`}
                      className="text-[13px] font-bold truncate hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-selection after:absolute after:inset-0"
                    >
                      {p.name}
                    </Link>
                    <span className="hidden sm:block font-mono text-[10.5px] uppercase text-text-secondary truncate">{formatLabel(p)}</span>
                    <span className="hidden sm:block font-mono text-[10.5px] text-text-secondary">{pages.length}</span>
                    <span className="font-mono text-[10.5px] text-text-tertiary">{relativeDate(p.updatedAt)}</span>
                    <span className="relative z-10">
                      <ProjectMenu p={p} open={menuFor === p.id} onToggle={setMenuFor} onDelete={onDelete} inline />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProjectMenu({
  p,
  open,
  onToggle,
  onDelete,
  inline,
}: {
  p: ProjectRow;
  open: boolean;
  onToggle: (id: string | null) => void;
  onDelete: (id: string) => void;
  inline?: boolean;
}) {
  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle(open ? null : p.id);
        }}
        aria-label={`Options for ${p.name}`}
        aria-expanded={open}
        className={cx(
          "w-[22px] h-[22px] flex items-center justify-center bg-surface-inverse text-text-inverse transition-opacity",
          "focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selection",
          inline ? "opacity-0 group-hover:opacity-100" : "absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100",
          open && "opacity-100"
        )}
      >
        <MoreIcon className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div
          className={cx(
            "absolute z-20 bg-surface-2 border border-border-default rounded-float shadow-pop py-1 min-w-[140px] animate-scale-in",
            inline ? "top-7 right-0" : "top-8 right-1.5"
          )}
        >
          <Link
            href={`/?project=${p.id}`}
            className="block px-3 py-1.5 text-[12.5px] text-text-primary hover:bg-surface-3"
          >
            Open
          </Link>
          <button
            onClick={() => onDelete(p.id)}
            className="w-full text-left px-3 py-1.5 text-[12.5px] text-danger hover:bg-danger-tint"
          >
            Delete
          </button>
        </div>
      )}
    </>
  );
}
