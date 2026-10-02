"use client";

import { useEffect, useState } from "react";
import { db, type Project } from "../../lib/db";
import { deleteProjectSynced, pushProject } from "../../lib/project-sync";
import { normalizePages, countElements } from "../../lib/project-data";
import DesignThumbnail from "../design-thumbnail";
import { useEditorStore } from "../../store/editor-store";
import { toast } from "../../store/toast-store";
import { PlusIcon, TrashIcon } from "./icons";
import Modal from "../ui/modal";
import { btnPrimary } from "../ui/buttons";

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

// Rows are read straight from IndexedDB, and one cached before the multi-page
// change may not have gone through the Dexie v3 upgrade yet — so every read of
// the stack goes through normalizePages rather than trusting `pages`.
function coverColor(p: Project): string {
  return normalizePages(p)[0].backgroundColor;
}
function pageCount(p: Project): number {
  return normalizePages(p).length;
}
function elementCount(p: Project): number {
  return countElements(normalizePages(p));
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
      pages: normalizePages(p),
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
      await deleteProjectSynced(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (id === currentProjectId) {
        newProject();
      }
      if (removed) {
        toast.action("Project deleted", "Undo", async () => {
          // Re-create locally with a fresh timestamp and push it back up.
          const restored = { ...removed, updatedAt: new Date(), dirty: false };
          await db.projects.put(restored);
          void pushProject(restored);
          loadProjects();
        });
      }
    } catch {
      toast.error("Couldn't delete project");
    }
    setDeleteConfirm(null);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="My projects"
      subtitle={`${projects.length} design${projects.length !== 1 ? "s" : ""}`}
      width="max-w-lg"
      bodyClassName="pb-3"
      footer={
        <>
          <span className="font-mono text-[10.5px] uppercase text-text-tertiary">
            Synced across your devices
          </span>
          <button onClick={handleNew} className={`${btnPrimary} h-8 px-3.5 text-[12.5px]`}>
            <PlusIcon className="w-3.5 h-3.5" />
            New design
          </button>
        </>
      }
    >
        <div className="-mx-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-text-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="font-mono text-[10.5px] uppercase text-text-tertiary">No projects yet</span>
              <button
                onClick={handleNew}
                className="text-[13px] font-semibold text-text-primary underline decoration-2 underline-offset-4 decoration-accent"
              >
                Create your first design
              </button>
            </div>
          ) : (
            <div className="border-t border-border-default">
              {projects.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open project ${p.name}`}
                  className={`flex items-center gap-3 px-3 py-2.5 border-b border-border-default transition-colors cursor-pointer group focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--selection)] ${
                    p.id === currentProjectId
                      ? "bg-selection-tint shadow-[inset_3px_0_0_var(--selection)]"
                      : "hover:bg-surface-3"
                  }`}
                  onClick={() => handleOpen(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleOpen(p);
                    }
                  }}
                >
                  {/* Live preview of page one, drawn from the stored document */}
                  <div
                    className="w-10 h-10 shadow-[inset_0_0_0_1px_rgb(0_0_0/0.07)] shrink-0 overflow-hidden"
                    style={{ backgroundColor: coverColor(p) }}
                  >
                    <DesignThumbnail
                      pages={normalizePages(p)}
                      format={p.format}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-text-primary truncate">
                        {p.name}
                      </span>
                      {p.id === currentProjectId && (
                        <span className="font-mono text-[10.5px] text-selection">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono uppercase">
                      <span className="text-[10.5px] text-text-tertiary">
                        {pageCount(p)} page{pageCount(p) !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[10.5px] text-text-tertiary">·</span>
                      <span className="text-[10.5px] text-text-tertiary">
                        {elementCount(p)} element{elementCount(p) !== 1 ? "s" : ""}
                      </span>
                      <span className="text-[10.5px] text-text-tertiary">·</span>
                      <span className="text-[10.5px] text-text-tertiary">
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
                          className="text-[12px] font-semibold text-danger border border-danger px-2 h-7 hover:bg-danger-tint transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="text-[12px] text-text-secondary px-2 h-7 hover:bg-surface-3 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(p.id)}
                        aria-label={`Delete project ${p.name}`}
                        title="Delete"
                        className="p-1.5 text-text-tertiary hover:text-danger opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all hover:bg-surface-3"
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
    </Modal>
  );
}

