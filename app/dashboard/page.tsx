"use client";

import { useCallback, useEffect, useState } from "react";
import { db } from "../lib/db";
import { toast } from "../store/toast-store";
import { useSettingsStore } from "../store/settings-store";
import { numberProjects } from "../lib/project-number";
import Toaster from "../components/editor/toaster";
import LicenseGate from "../components/license/license-gate";
import SettingsPanel from "../components/settings/settings-panel";
import DashboardTopbar from "../components/dashboard/dashboard-topbar";
import ProjectsView from "../components/dashboard/projects-view";
import type { Nav, ProjectRow } from "../components/dashboard/types";

export default function DashboardPage() {
  return (
    <LicenseGate>
      <Dashboard />
    </LicenseGate>
  );
}

function Dashboard() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [numbers, setNumbers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [nav, setNav] = useState<Nav>("projects");
  const aiKey = useSettingsStore((s) => s.aiKey);
  const aiKeyLoaded = useSettingsStore((s) => s.aiKeyLoaded);
  const loadAiKey = useSettingsStore((s) => s.loadAiKey);

  const load = useCallback(async () => {
    try {
      const rows = await db.projects.toArray();
      setNumbers(numberProjects(rows));
      setProjects(
        rows
          .map((p) => ({
            id: p.id,
            name: p.name,
            data: { format: p.format, pages: p.pages },
            createdAt: new Date(p.createdAt).toISOString(),
            updatedAt: new Date(p.updatedAt).toISOString(),
          }))
          .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
      );
    } catch {
      toast.error("Couldn't read your projects from this browser.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reads IndexedDB; every setState inside happens after an await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    void loadAiKey();
    // A restored backup lands new rows; re-read.
    const onChanged = () => void load();
    window.addEventListener("modo:projects-changed", onChanged);
    return () => window.removeEventListener("modo:projects-changed", onChanged);
  }, [load, loadAiKey]);

  const del = async (id: string) => {
    const removed = await db.projects.get(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      await db.projects.delete(id);
      toast.action(`Deleted “${removed?.name ?? "project"}”`, "Undo", async () => {
        if (removed) await db.projects.put(removed);
        void load();
      });
    } catch {
      toast.error("Couldn't delete project");
      void load();
    }
  };

  // `body { overflow: hidden }` is global for the editor's sake, so this page
  // has to own its own scroll container.
  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface-0 text-text-primary">
      <DashboardTopbar nav={nav} onNav={setNav} />
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {nav === "settings" ? (
          <div className="w-full max-w-[640px] px-5 sm:px-11 py-[34px] flex flex-col gap-6">
            <h1 className="text-[56px] sm:text-[88px] leading-[0.82] font-black font-wide tracking-[-0.04em]">
              Settings
            </h1>
            <SettingsPanel />
          </div>
        ) : (
          <ProjectsView
            hasKey={aiKeyLoaded ? !!aiKey : null}
            projects={projects}
            numbers={numbers}
            loading={loading}
            onDelete={del}
          />
        )}
      </main>

      <Toaster />
    </div>
  );
}
