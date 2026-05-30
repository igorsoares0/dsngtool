"use client";

import { useEffect, useState } from "react";
import { db, type Project } from "../../lib/db";
import { useEditorStore } from "../../store/editor-store";
import { toast } from "../../store/toast-store";
import { PlusIcon, TrashIcon } from "./icons";

function formatDate(date: Date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProjectsModal({ onClose }: { onClose: () => void }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const currentProjectId = useEditorStore((s) => s.projectId);
  const loadProject = useEditorStore((s) => s.loadProject);
  const newProject = useEditorStore((s) => s.newProject);

  const loadProjects = async () => {
    try {
      const all = await db.projects.orderBy("updatedAt").reverse().toArray();
      setProjects(all);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleOpen = (p: Project) => {
    loadProject({
      id: p.id,
      name: p.name,
      elements: p.elements,
      backgroundColor: p.backgroundColor,
      backgroundGradient: p.backgroundGradient ?? null,
      format: p.format,
    });
    onClose();
  };

  const handleNew = () => {
    newProject();
    onClose();
  };

  const handleDelete = async (id: string) => {
    const removed = projects.find((p) => p.id === id);
    try {
      await db.projects.delete(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (id === currentProjectId) {
        newProject();
      }
      if (removed) {
        toast.action("Project deleted", "Undo", async () => {
          await db.projects.put(removed);
          loadProjects();
        });
      }
    } catch {
      toast.error("Couldn't delete project");
    }
    setDeleteConfirm(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My projects"
        className="relative bg-surface-1 border border-border-default rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-text-primary">
            My Projects
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="flex items-center gap-1.5 bg-accent-green hover:bg-accent-green-hover text-surface-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              New
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-text-ghost hover:text-text-secondary p-1 rounded transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-text-ghost text-xs">No projects yet</span>
              <button
                onClick={handleNew}
                className="text-accent-green text-xs hover:underline"
              >
                Create your first design
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {projects.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open project ${p.name}`}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/50 ${
                    p.id === currentProjectId
                      ? "bg-accent-green/10 border border-accent-green/20"
                      : "hover:bg-surface-2 border border-transparent"
                  }`}
                  onClick={() => handleOpen(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpen(p);
                    }
                  }}
                >
                  {/* Color preview */}
                  <div
                    className="w-10 h-10 rounded-md border border-border-subtle shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: p.backgroundColor }}
                  >
                    <span className="text-[8px] font-medium" style={{
                      color: isLight(p.backgroundColor) ? "#666" : "#ccc",
                    }}>
                      {p.format.width}×{p.format.height}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {p.name}
                      </span>
                      {p.id === currentProjectId && (
                        <span className="text-[9px] text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-ghost">
                        {p.elements.length} element{p.elements.length !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[10px] text-text-ghost">·</span>
                      <span className="text-[10px] text-text-ghost">
                        {formatDate(p.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {deleteConfirm === p.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-[10px] text-accent-pink bg-accent-pink/10 px-2 py-1 rounded hover:bg-accent-pink/20 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[10px] text-text-ghost px-2 py-1 rounded hover:bg-surface-3 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        aria-label={`Delete project ${p.name}`}
                        title="Delete"
                        className="p-1.5 text-text-ghost hover:text-accent-pink opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all rounded hover:bg-surface-3"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function isLight(hex: string): boolean {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}
